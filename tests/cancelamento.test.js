// cancelar_reserva(p_sessao_id, p_reserva_id) (ticket #8).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  prepararBanco,
  rpc,
  novaSessao,
  reservar,
  reservarOk,
  estoqueVisto,
  esperar,
  clienteAnon,
  confirmar,
  EVENTO_TESTE,
} from './apoio/banco.js';

const cancelar = (sessaoId, reservaId) =>
  rpc('cancelar_reserva', { p_sessao_id: sessaoId, p_reserva_id: reservaId });

const UUID_QUALQUER = '00000000-0000-4000-8000-000000000000';

beforeEach(() => prepararBanco());

// ---- Cancelamento libera o estoque ----

test('cancelar devolve os Ingressos ao Estoque disponível na hora', async () => {
  const ana = await novaSessao('Ana');
  const reserva = await reservarOk(ana, 4);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 4);

  const r = await cancelar(ana, reserva.id);
  assert.equal(r.ok, true);
  assert.equal(r.estoque_disponivel, EVENTO_TESTE.capacidade);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade);
});

test('depois de cancelar, a Sessão volta para a seleção (sem Reserva para retomar)', async () => {
  const ana = await novaSessao('Ana');
  const reserva = await reservarOk(ana, 2);
  await cancelar(ana, reserva.id);
  const vitrine = await rpc('consultar_evento', { p_sessao_id: ana });
  assert.equal(vitrine.reserva, null);
});

test('Ingressos liberados pelo cancelamento podem ser reservados por outra Sessão', async () => {
  const ana = await novaSessao('Ana');
  const bia = await novaSessao('Bia');
  await reservarOk(bia, 5);
  const reserva = await reservarOk(ana, 5);
  assert.equal((await reservar(await novaSessao('Caio'), 1)).motivo, 'estoque_insuficiente');

  await cancelar(ana, reserva.id);
  const caio = await reservar(await novaSessao('Caio'), 5);
  assert.equal(caio.ok, true);
});

test('depois de cancelar, a Sessão pode reservar de novo', async () => {
  const ana = await novaSessao('Ana');
  const primeira = await reservarOk(ana, 3);
  await cancelar(ana, primeira.id);
  const segunda = await reservarOk(ana, 2);
  assert.notEqual(segunda.id, primeira.id);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 2);
});

// ---- Idempotência ----

test('cancelar de novo não gera Falha e não altera nada', async () => {
  const ana = await novaSessao('Ana');
  const reserva = await reservarOk(ana, 3);
  await cancelar(ana, reserva.id);

  const segunda = await cancelar(ana, reserva.id);
  assert.equal(segunda.ok, true);
  assert.equal(segunda.estoque_disponivel, EVENTO_TESTE.capacidade);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade);
});

test('cancelar Reserva já cancelada por substituição não gera Falha e não mexe na nova', async () => {
  const ana = await novaSessao('Ana');
  const antiga = await reservarOk(ana, 2);
  const nova = await reservarOk(ana, 4); // substitui: a antiga fica cancelada

  const r = await cancelar(ana, antiga.id);
  assert.equal(r.ok, true);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 4, 'a nova Reserva continua bloqueando');
  const vitrine = await rpc('consultar_evento', { p_sessao_id: ana });
  assert.equal(vitrine.reserva?.id, nova.id);
});

test('cancelamentos simultâneos da mesma Reserva não geram Falha', async () => {
  const ana = await novaSessao('Ana');
  const reserva = await reservarOk(ana, 3);
  const respostas = await Promise.all(
    Array.from({ length: 5 }, () =>
      rpc('cancelar_reserva', { p_sessao_id: ana, p_reserva_id: reserva.id }, clienteAnon()),
    ),
  );
  for (const r of respostas) assert.equal(r.ok, true);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade);
});

test('cancelar Reserva expirada não gera Falha e não altera o Estoque disponível', async () => {
  await prepararBanco({ tempo_reserva_segundos: 1 });
  const ana = await novaSessao('Ana');
  const reserva = await reservarOk(ana, 3);
  await esperar(1_500);
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade);

  const r = await cancelar(ana, reserva.id);
  assert.equal(r.ok, true);
  assert.equal(r.estoque_disponivel, EVENTO_TESTE.capacidade);
});

// ---- Reserva convertida em Venda ----

test('Reserva convertida em Venda não pode ser cancelada (reserva_ja_finalizada)', async () => {
  const ana = await novaSessao('Ana');
  const reserva = await reservarOk(ana, 3);
  const venda = await confirmar(ana, reserva.id);
  assert.equal(venda.ok, true);

  const r = await cancelar(ana, reserva.id);
  assert.deepEqual(r, { ok: false, motivo: 'reserva_ja_finalizada' });
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 3, 'os Ingressos vendidos continuam fora do Estoque disponível');
});

test('Reserva cancelada não pode ser confirmada', async () => {
  const ana = await novaSessao('Ana');
  const reserva = await reservarOk(ana, 3);
  await cancelar(ana, reserva.id);

  const r = await confirmar(ana, reserva.id);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'reserva_ja_finalizada');
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade, 'nenhum Ingresso foi vendido');
});

// ---- Sessão e Reserva de outra Sessão ----

test('uma Sessão não consegue cancelar a Reserva de outra', async () => {
  const ana = await novaSessao('Ana');
  const bia = await novaSessao('Bia');
  const reservaDaAna = await reservarOk(ana, 4);

  const r = await cancelar(bia, reservaDaAna.id);
  assert.deepEqual(r, { ok: false, motivo: 'reserva_inexistente' });
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 4, 'a Reserva da Ana continua bloqueando');
  const vitrine = await rpc('consultar_evento', { p_sessao_id: ana });
  assert.equal(vitrine.reserva?.id, reservaDaAna.id);
});

test('uma Sessão também não cancela a Reserva de outra já cancelada (não vira sucesso)', async () => {
  const ana = await novaSessao('Ana');
  const bia = await novaSessao('Bia');
  const reservaDaAna = await reservarOk(ana, 2);
  await cancelar(ana, reservaDaAna.id);
  const r = await cancelar(bia, reservaDaAna.id);
  assert.deepEqual(r, { ok: false, motivo: 'reserva_inexistente' });
});

test('Reserva inexistente ou sem id é Recusa reserva_inexistente', async () => {
  const ana = await novaSessao('Ana');
  assert.deepEqual(await cancelar(ana, UUID_QUALQUER), { ok: false, motivo: 'reserva_inexistente' });
  assert.deepEqual(await rpc('cancelar_reserva', { p_sessao_id: ana }), { ok: false, motivo: 'reserva_inexistente' });
});

test('Sessão inexistente ou sem id é Recusa sessao_invalida', async () => {
  const ana = await novaSessao('Ana');
  const reserva = await reservarOk(ana, 2);
  assert.deepEqual(await cancelar(UUID_QUALQUER, reserva.id), { ok: false, motivo: 'sessao_invalida' });
  assert.deepEqual(await rpc('cancelar_reserva', {}), { ok: false, motivo: 'sessao_invalida' });
  assert.equal(await estoqueVisto(), EVENTO_TESTE.capacidade - 2);
});
