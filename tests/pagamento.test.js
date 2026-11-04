// confirmar_pagamento(p_sessao_id, p_reserva_id): Pagamento simulado transforma a Reserva em Venda (ticket #7).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  prepararBanco,
  configurarEvento,
  clienteAnon,
  rpc,
  novaSessao,
  reservar,
  reservarOk,
  estoqueVisto,
  esperar,
  ingressosComprometidos,
  confirmar,
  segurarTravaDoEvento,
  UUID,
  EVENTO_TESTE,
} from './apoio/banco.js';

beforeEach(() => prepararBanco());

// ---- Confirmação válida ----

test('confirmação válida devolve a Venda com quantidade, Preço unitário, total e identificador', async () => {
  await prepararBanco({ preco: 12.5 });
  const id = await novaSessao('Ana');
  const reserva = await reservarOk(id, 3);
  const r = await confirmar(id, reserva.id);
  assert.equal(r.ok, true);
  assert.match(r.venda.id, UUID);
  assert.notEqual(r.venda.id, reserva.id, 'Venda tem identificador próprio');
  assert.equal(r.venda.quantidade, 3);
  assert.equal(r.venda.preco_unitario, 12.5);
  assert.equal(r.venda.total, 37.5);
  assert.ok(Number.isFinite(Date.parse(r.venda.criada_em)));
  assert.equal(r.estoque_disponivel, EVENTO_TESTE.capacidade - 3);
});

test('confirmação válida cria exatamente uma Venda e o Estoque disponível continua descontado', async () => {
  const id = await novaSessao();
  const reserva = await reservarOk(id, 4);
  assert.equal((await confirmar(id, reserva.id)).ok, true);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 4);
  const integridade = await ingressosComprometidos();
  assert.deepEqual(integridade, { vendidos: 4, reservados: 0, reservasAtivas: 0 });
});

test('Ingressos vendidos continuam descontados depois que o Tempo de reserva passaria', async () => {
  await prepararBanco({ tempo_reserva_segundos: 1 });
  const id = await novaSessao();
  const reserva = await reservarOk(id, 2);
  assert.equal((await confirmar(id, reserva.id)).ok, true);
  await esperar(1_500);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 2);
});

test('depois da Venda a Sessão não tem mais Reserva para retomar', async () => {
  const id = await novaSessao();
  const reserva = await reservarOk(id, 1);
  await confirmar(id, reserva.id);
  const r = await rpc('consultar_evento', { p_sessao_id: id });
  assert.equal(r.reserva, null);
});

test('depois da Venda a Sessão pode reservar de novo sem desfazer a Venda', async () => {
  const id = await novaSessao();
  const primeira = await reservarOk(id, 2);
  await confirmar(id, primeira.id);
  await reservarOk(id, 3);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 5);
  const { vendidos, reservados } = await ingressosComprometidos();
  assert.equal(vendidos, 2);
  assert.equal(reservados, 3);
});

// ---- Preço congelado ----

test('Venda guarda Preço unitário e total da Reserva, mesmo que o Preço do Evento mude depois', async () => {
  await prepararBanco({ preco: 50 });
  const id = await novaSessao();
  const reserva = await reservarOk(id, 3);
  await configurarEvento({ preco: 99.9 });
  const r = await confirmar(id, reserva.id);
  assert.equal(r.ok, true);
  assert.equal(r.venda.preco_unitario, 50);
  assert.equal(r.venda.total, 150);
});

// ---- Expiração ----

test('confirmar após a expiração gera Recusa reserva_expirada e nenhuma Venda', async () => {
  await prepararBanco({ tempo_reserva_segundos: 1 });
  const id = await novaSessao();
  const reserva = await reservarOk(id, 3);
  await esperar(1_300);
  assert.deepEqual(await confirmar(id, reserva.id), { ok: false, motivo: 'reserva_expirada' });
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade);
  assert.equal((await ingressosComprometidos()).vendidos, 0);
});

test('confirmar uma Reserva expirada de novo continua recusando reserva_expirada', async () => {
  await prepararBanco({ tempo_reserva_segundos: 1 });
  const id = await novaSessao();
  const reserva = await reservarOk(id, 1);
  await esperar(1_300);
  await confirmar(id, reserva.id);
  assert.deepEqual(await confirmar(id, reserva.id), { ok: false, motivo: 'reserva_expirada' });
});

// ---- Confirmação dupla ----

test('confirmar duas vezes gera uma única Venda; a segunda recebe reserva_ja_finalizada', async () => {
  const id = await novaSessao();
  const reserva = await reservarOk(id, 2);
  assert.equal((await confirmar(id, reserva.id)).ok, true);
  assert.deepEqual(await confirmar(id, reserva.id), { ok: false, motivo: 'reserva_ja_finalizada' });
  assert.equal((await ingressosComprometidos()).vendidos, 2);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 2);
});

test('confirmar duas vezes simultaneamente gera uma única Venda; a outra recebe reserva_ja_finalizada', async () => {
  const id = await novaSessao();
  const reserva = await reservarOk(id, 2);
  const respostas = await Promise.all([
    confirmar(id, reserva.id, clienteAnon()),
    confirmar(id, reserva.id, clienteAnon()),
  ]);
  const aceitas = respostas.filter((r) => r.ok);
  const recusas = respostas.filter((r) => !r.ok);
  assert.equal(aceitas.length, 1);
  assert.deepEqual(recusas, [{ ok: false, motivo: 'reserva_ja_finalizada' }]);
  assert.equal((await ingressosComprometidos()).vendidos, 2);
});

test('muitas confirmações simultâneas da mesma Reserva geram uma única Venda', async () => {
  const id = await novaSessao();
  const reserva = await reservarOk(id, 5);
  const respostas = await Promise.all(
    Array.from({ length: 10 }, () => confirmar(id, reserva.id, clienteAnon())),
  );
  assert.equal(respostas.filter((r) => r.ok).length, 1);
  for (const r of respostas.filter((x) => !x.ok)) {
    assert.deepEqual(r, { ok: false, motivo: 'reserva_ja_finalizada' });
  }
  assert.equal((await ingressosComprometidos()).vendidos, 5);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 5);
});

// ---- Reserva já finalizada ----

test('Reserva substituída (cancelada) não pode ser confirmada: reserva_ja_finalizada', async () => {
  const id = await novaSessao();
  const antiga = await reservarOk(id, 2);
  const nova = await reservarOk(id, 3);
  assert.deepEqual(await confirmar(id, antiga.id), { ok: false, motivo: 'reserva_ja_finalizada' });
  assert.equal((await ingressosComprometidos()).vendidos, 0);
  // a Reserva vigente continua confirmável
  assert.equal((await confirmar(id, nova.id)).ok, true);
});

// ---- Reserva inexistente ou de outra Sessão ----

test('Reserva de outra Sessão gera reserva_inexistente e não afeta a dona', async () => {
  const ana = await novaSessao('Ana');
  const bia = await novaSessao('Bia');
  const reserva = await reservarOk(ana, 2);
  assert.deepEqual(await confirmar(bia, reserva.id), { ok: false, motivo: 'reserva_inexistente' });
  assert.equal((await ingressosComprometidos()).vendidos, 0);
  const daAna = await rpc('consultar_evento', { p_sessao_id: ana });
  assert.equal(daAna.reserva.id, reserva.id, 'a Reserva da Ana continua ativa');
  assert.equal((await confirmar(ana, reserva.id)).ok, true);
});

test('Reserva inexistente gera reserva_inexistente', async () => {
  const id = await novaSessao();
  assert.deepEqual(await confirmar(id, randomUUID()), { ok: false, motivo: 'reserva_inexistente' });
});

test('Reserva não informada gera reserva_inexistente', async () => {
  const id = await novaSessao();
  assert.deepEqual(await rpc('confirmar_pagamento', { p_sessao_id: id }), {
    ok: false,
    motivo: 'reserva_inexistente',
  });
});

// ---- Sessão inválida ----

test('Sessão inexistente ou não informada gera sessao_invalida', async () => {
  const id = await novaSessao();
  const reserva = await reservarOk(id, 1);
  assert.deepEqual(await confirmar(randomUUID(), reserva.id), { ok: false, motivo: 'sessao_invalida' });
  assert.deepEqual(await rpc('confirmar_pagamento', { p_reserva_id: reserva.id }), {
    ok: false,
    motivo: 'sessao_invalida',
  });
  assert.deepEqual(await rpc('confirmar_pagamento', {}), { ok: false, motivo: 'sessao_invalida' });
});

// ---- Concorrência com reservar ----

test('confirmações e novas Reservas simultâneas nunca passam da Capacidade', async () => {
  // 5 Sessões com 2 Ingressos reservados cada (Capacidade 10) confirmam ao mesmo tempo
  // em que outras 5 Sessões tentam reservar 1 Ingresso.
  const compradoras = await Promise.all([1, 2, 3, 4, 5].map((i) => novaSessao(`Compradora ${i}`)));
  const reservas = [];
  for (const s of compradoras) reservas.push(await reservarOk(s, 2));
  const outras = await Promise.all([1, 2, 3, 4, 5].map((i) => novaSessao(`Outra ${i}`)));
  const respostas = await Promise.all([
    ...compradoras.map((s, i) => confirmar(s, reservas[i].id, clienteAnon())),
    ...outras.map((s) => reservar(s, 1, clienteAnon())),
  ]);
  const confirmacoes = respostas.slice(0, 5);
  const novas = respostas.slice(5);
  assert.ok(confirmacoes.every((r) => r.ok), JSON.stringify(confirmacoes));
  assert.ok(novas.every((r) => !r.ok && r.motivo === 'estoque_insuficiente'), JSON.stringify(novas));
  const { vendidos, reservados } = await ingressosComprometidos();
  assert.equal(vendidos, 10);
  assert.equal(reservados, 0);
  assert.equal(await estoqueVisto(), 0);
});

test('Reserva expirada disputada: confirmação recusada e os Ingressos ficam para a nova Reserva', async () => {
  await prepararBanco({ capacidade: 3, tempo_reserva_segundos: 1 });
  const ana = await novaSessao('Ana');
  const bia = await novaSessao('Bia');
  const reserva = await reservarOk(ana, 3);
  await esperar(1_300);
  // Bia só consegue os 3 Ingressos porque a Reserva da Ana expirou.
  const [confirmacao, novaReserva] = await Promise.all([
    confirmar(ana, reserva.id, clienteAnon()),
    reservar(bia, 3, clienteAnon()),
  ]);
  assert.deepEqual(confirmacao, { ok: false, motivo: 'reserva_expirada' });
  assert.equal(novaReserva.ok, true);
  const { vendidos, reservados } = await ingressosComprometidos();
  assert.equal(vendidos, 0);
  assert.equal(reservados, 3);
});

test('confirmação que esperou a trava do Evento devolve o Estoque disponível pelo relógio de depois da trava', async () => {
  await prepararBanco({ capacidade: 5, tempo_reserva_segundos: 120 });
  const ana = await novaSessao('Ana');
  const bia = await novaSessao('Bia');
  const reserva = await reservarOk(ana, 3);
  await configurarEvento({ tempo_reserva_segundos: 1 });
  await reservarOk(bia, 2); // expira durante a espera
  const trava = await segurarTravaDoEvento(2_000);
  const r = await confirmar(ana, reserva.id);
  await trava.liberada;
  assert.equal(r.ok, true, `recusou com ${r.motivo}`);
  assert.equal(r.estoque_disponivel, 2, 'os Ingressos da Reserva expirada da Bia já contam como livres');
});
