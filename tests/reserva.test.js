// reservar(p_sessao_id, p_quantidade) e a retomada da Reserva por consultar_evento (ticket #6).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  prepararBanco,
  configurarEvento,
  rpc,
  novaSessao,
  reservar,
  reservarOk,
  estoqueVisto,
  esperar,
  EVENTO_TESTE,
} from './apoio/banco.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeEach(() => prepararBanco());

// ---- Reserva válida ----

test('reserva válida devolve a Reserva com Preço unitário, total, expiração e horário do banco', async () => {
  await prepararBanco({ preco: 12.5, tempo_reserva_segundos: 120 });
  const id = await novaSessao('Ana');
  const r = await reservar(id, 3);
  assert.equal(r.ok, true);
  assert.match(r.reserva.id, UUID);
  assert.equal(r.reserva.quantidade, 3);
  assert.equal(r.reserva.preco_unitario, 12.5);
  assert.equal(r.reserva.total, 37.5);
  const agora = Date.parse(r.agora);
  const expira = Date.parse(r.reserva.expira_em);
  assert.ok(Number.isFinite(agora) && Number.isFinite(expira));
  // expira em = agora + Tempo de reserva (pelo relógio do banco)
  assert.ok(Math.abs(expira - agora - 120_000) < 2_000, `expira_em ${r.reserva.expira_em} vs agora ${r.agora}`);
  assert.equal(r.estoque_disponivel, EVENTO_TESTE.capacidade - 3);
});

test('reserva válida reduz o Estoque disponível visto por qualquer Sessão', async () => {
  const ana = await novaSessao('Ana');
  const bia = await novaSessao('Bia');
  await reservarOk(ana, 4);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 4);
  const vistoPelaBia = await rpc('consultar_evento', { p_sessao_id: bia });
  assert.equal(vistoPelaBia.estoque_disponivel, EVENTO_TESTE.capacidade - 4);
  assert.equal(vistoPelaBia.reserva, null, 'a Reserva da Ana não aparece para a Bia');
});

test('reservar exatamente o Limite por reserva é aceito', async () => {
  const id = await novaSessao();
  const r = await reservar(id, EVENTO_TESTE.limite_por_reserva);
  assert.equal(r.ok, true);
});

test('reservas de Sessões diferentes somam até esgotar', async () => {
  const a = await novaSessao('A');
  const b = await novaSessao('B');
  await reservarOk(a, 5);
  await reservarOk(b, 5);
  const r = await rpc('consultar_evento');
  assert.equal(r.estoque_disponivel, 0);
  assert.equal(r.esgotado, true);
});

test('Preço unitário fica congelado na Reserva mesmo que o Preço do Evento mude', async () => {
  await prepararBanco({ preco: 10 });
  const id = await novaSessao();
  await reservarOk(id, 2);
  await configurarEvento({ preco: 99 });
  const r = await rpc('consultar_evento', { p_sessao_id: id });
  assert.equal(r.reserva.preco_unitario, 10);
  assert.equal(r.reserva.total, 20);
});

// ---- Recusas ----

for (const [descricao, quantidade] of [
  ['zero', 0],
  ['negativa', -1],
  ['fracionária', 1.5],
  ['não numérica', 'abc'],
  ['texto numérico', '2'],
  ['booleana', true],
  ['nula', null],
]) {
  test(`quantidade ${descricao} gera Recusa quantidade_invalida sem criar Reserva`, async () => {
    const id = await novaSessao();
    const r = await reservar(id, quantidade);
    assert.deepEqual(r, { ok: false, motivo: 'quantidade_invalida' });
    assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade);
    const c = await rpc('consultar_evento', { p_sessao_id: id });
    assert.equal(c.reserva, null);
  });
}

test('quantidade ausente gera Recusa quantidade_invalida', async () => {
  const id = await novaSessao();
  const r = await rpc('reservar', { p_sessao_id: id });
  assert.deepEqual(r, { ok: false, motivo: 'quantidade_invalida' });
});

for (const quantidade of [EVENTO_TESTE.limite_por_reserva + 1, 1e12]) {
  test(`quantidade ${quantidade} acima do Limite por reserva gera Recusa limite_excedido sem criar Reserva`, async () => {
    const id = await novaSessao();
    const r = await reservar(id, quantidade);
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'limite_excedido');
    assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade);
  });
}

test('pedido maior que o Estoque disponível gera Recusa estoque_insuficiente com o Estoque atual', async () => {
  await prepararBanco({ capacidade: 6 });
  const a = await novaSessao('A');
  const b = await novaSessao('B');
  await reservarOk(a, 4);
  const r = await reservar(b, 3);
  assert.deepEqual(r, { ok: false, motivo: 'estoque_insuficiente', estoque_disponivel: 2 });
  assert.equal(await estoqueVisto(), 2, 'a Recusa não cria Reserva');
  const c = await rpc('consultar_evento', { p_sessao_id: b });
  assert.equal(c.reserva, null);
});

test('com Esgotado qualquer pedido gera Recusa estoque_insuficiente com Estoque zero', async () => {
  await prepararBanco({ capacidade: 0 });
  const id = await novaSessao();
  const r = await reservar(id, 1);
  assert.deepEqual(r, { ok: false, motivo: 'estoque_insuficiente', estoque_disponivel: 0 });
});

test('Sessão inexistente gera Recusa sessao_invalida', async () => {
  const r = await reservar(crypto.randomUUID(), 1);
  assert.deepEqual(r, { ok: false, motivo: 'sessao_invalida' });
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade);
});

test('sem Sessão gera Recusa sessao_invalida', async () => {
  const r = await rpc('reservar', { p_quantidade: 1 });
  assert.deepEqual(r, { ok: false, motivo: 'sessao_invalida' });
});

// ---- Substituição ----

test('nova Reserva da mesma Sessão substitui a anterior', async () => {
  const id = await novaSessao();
  const primeira = await reservarOk(id, 2);
  const segunda = await reservarOk(id, 3);
  assert.notEqual(segunda.id, primeira.id);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 3, 'só a nova Reserva bloqueia Ingressos');
  const c = await rpc('consultar_evento', { p_sessao_id: id });
  assert.equal(c.reserva.id, segunda.id);
  assert.equal(c.reserva.quantidade, 3);
});

test('na substituição, os Ingressos da Reserva anterior contam como livres para a nova', async () => {
  await prepararBanco({ capacidade: 5 });
  const id = await novaSessao();
  await reservarOk(id, 5); // Esgotado
  const r = await reservar(id, 5);
  assert.equal(r.ok, true, `deveria aceitar, recusou com ${r.motivo}`);
  assert.equal(r.estoque_disponivel, 0);
});

test('substituição recusada mantém a Reserva anterior', async () => {
  await prepararBanco({ capacidade: 6 });
  const a = await novaSessao('A');
  const b = await novaSessao('B');
  const anterior = await reservarOk(a, 2);
  await reservarOk(b, 3); // sobra 1 (+2 da própria A)
  const r = await reservar(a, 4);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'estoque_insuficiente');
  const c = await rpc('consultar_evento', { p_sessao_id: a });
  assert.equal(c.reserva?.id, anterior.id, 'a Reserva anterior continua ativa');
  assert.equal(await estoqueVisto(), 1);
});

test('substituição com quantidade inválida mantém a Reserva anterior', async () => {
  const id = await novaSessao();
  const anterior = await reservarOk(id, 2);
  assert.equal((await reservar(id, 0)).motivo, 'quantidade_invalida');
  assert.equal((await reservar(id, 99)).motivo, 'limite_excedido');
  const c = await rpc('consultar_evento', { p_sessao_id: id });
  assert.equal(c.reserva?.id, anterior.id);
});

// ---- Retomada (consultar_evento devolve a Reserva ativa) ----

test('consultar_evento com a Sessão devolve a Reserva ativa, igual à criada, para retomar o Checkout', async () => {
  const id = await novaSessao();
  const criada = await reservar(id, 2);
  const c = await rpc('consultar_evento', { p_sessao_id: id });
  assert.deepEqual(c.reserva, criada.reserva);
  assert.ok(Date.parse(c.agora) >= Date.parse(criada.agora));
});

test('consultar_evento sem Sessão nunca devolve Reserva', async () => {
  const id = await novaSessao();
  await reservarOk(id, 2);
  const c = await rpc('consultar_evento');
  assert.equal(c.reserva, null);
});

// ---- Expiração (Tempo de reserva curto, sem mexer no relógio do banco) ----

test('Reserva expirada deixa de contar no Estoque disponível logo após o prazo', async () => {
  await prepararBanco({ capacidade: 3, tempo_reserva_segundos: 2 });
  const a = await novaSessao('A');
  const criada = await reservar(a, 3);
  assert.equal(criada.ok, true);
  assert.equal(await estoqueVisto(), 0);

  const restante = Date.parse(criada.reserva.expira_em) - Date.parse(criada.agora);
  await esperar(restante + 300);

  const c = await rpc('consultar_evento', { p_sessao_id: a });
  assert.equal(c.estoque_disponivel, 3);
  assert.equal(c.esgotado, false);
  assert.equal(c.reserva, null, 'Reserva expirada não é retomada');

  const b = await novaSessao('B');
  const r = await reservar(b, 3);
  assert.equal(r.ok, true, 'outra Sessão consegue os Ingressos liberados');
});

test('antes do prazo a Reserva ainda bloqueia os Ingressos', async () => {
  await prepararBanco({ capacidade: 2, tempo_reserva_segundos: 3 });
  const a = await novaSessao('A');
  await reservarOk(a, 2);
  await esperar(1_000);
  const b = await novaSessao('B');
  const r = await reservar(b, 1);
  assert.equal(r.motivo, 'estoque_insuficiente');
});

test('Sessão com Reserva expirada pode reservar de novo', async () => {
  await prepararBanco({ tempo_reserva_segundos: 1 });
  const id = await novaSessao();
  await reservarOk(id, 2);
  await esperar(1_400);
  const r = await reservar(id, 4);
  assert.equal(r.ok, true, `recusou com ${r.motivo}`);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 4);
});
