import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, rpc, novaSessao, EVENTO_TESTE } from './apoio/banco.js';

beforeEach(() => prepararBanco());

test('consultar_evento sem Sessão devolve o Evento, Preço e Limite por reserva', async () => {
  const r = await rpc('consultar_evento');
  assert.equal(r.ok, true);
  assert.equal(r.evento.nome, EVENTO_TESTE.nome);
  assert.equal(r.evento.descricao, EVENTO_TESTE.descricao);
  assert.equal(r.evento.local, EVENTO_TESTE.local);
  assert.equal(new Date(r.evento.data).toISOString(), new Date(EVENTO_TESTE.data).toISOString());
  assert.equal(r.evento.preco, EVENTO_TESTE.preco);
  assert.equal(r.evento.limite_por_reserva, EVENTO_TESTE.limite_por_reserva);
  assert.equal(r.sessao, null);
  assert.equal(r.reserva, null);
});

test('Preço é devolvido com centavos', async () => {
  await prepararBanco({ preco: 12.34 });
  const r = await rpc('consultar_evento');
  assert.equal(r.evento.preco, 12.34);
});

test('sem Reservas nem Vendas, Estoque disponível é igual à Capacidade e não está Esgotado', async () => {
  const r = await rpc('consultar_evento');
  assert.equal(r.estoque_disponivel, EVENTO_TESTE.capacidade);
  assert.equal(r.esgotado, false);
});

test('Capacidade zero aparece como Esgotado', async () => {
  await prepararBanco({ capacidade: 0 });
  const r = await rpc('consultar_evento');
  assert.equal(r.estoque_disponivel, 0);
  assert.equal(r.esgotado, true);
});

test('devolve o horário atual do banco', async () => {
  const antes = Date.now();
  const r = await rpc('consultar_evento');
  const agora = Date.parse(r.agora);
  assert.ok(Number.isFinite(agora), `agora inválido: ${r.agora}`);
  // banco local roda na mesma máquina: tolerância generosa só para absorver relógio do container
  assert.ok(Math.abs(agora - antes) < 60_000, `agora muito distante do relógio local: ${r.agora}`);
});

test('com Sessão válida e sem Reserva, devolve a Sessão e reserva nula', async () => {
  const id = await novaSessao('Bia');
  const r = await rpc('consultar_evento', { p_sessao_id: id });
  assert.equal(r.ok, true);
  assert.deepEqual(r.sessao, { id, nome: 'Bia' });
  assert.equal(r.reserva, null);
  assert.equal(r.estoque_disponivel, EVENTO_TESTE.capacidade);
});

test('Sessão inexistente gera Recusa sessao_invalida', async () => {
  const r = await rpc('consultar_evento', { p_sessao_id: crypto.randomUUID() });
  assert.deepEqual(r, { ok: false, motivo: 'sessao_invalida' });
});

test('Sessão apagada (como após um Reinício da demonstração) gera Recusa sessao_invalida', async () => {
  const id = await novaSessao('Caio');
  await prepararBanco(); // apaga todas as Sessões
  const r = await rpc('consultar_evento', { p_sessao_id: id });
  assert.deepEqual(r, { ok: false, motivo: 'sessao_invalida' });
});
