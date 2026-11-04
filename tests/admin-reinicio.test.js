import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { confirmar, esperar, novaSessao, prepararBanco, reservar, reservarOk, rpc, segurarTravaDoEvento } from './apoio/banco.js';

const cancelar = (sessaoId, reservaId) =>
  rpc('cancelar_reserva', { p_sessao_id: sessaoId, p_reserva_id: reservaId });

beforeEach(() => prepararBanco({ capacidade: 8, preco: 13.50, tempo_reserva_segundos: 30, limite_por_reserva: 3 }));

test('Reinício devolve o Estoque disponível à Capacidade, preserva o Evento e invalida Sessões anteriores', async () => {
  const compradora = await novaSessao('Ana');
  const convertida = await reservarOk(compradora, 2);
  assert.equal((await confirmar(compradora, convertida.id)).ok, true);
  const checkout = await novaSessao('Bia');
  const ativa = await reservarOk(checkout, 3);
  const semReserva = await novaSessao('Caio');
  const painelAntes = await rpc('admin_consultar');
  const vitrineAntes = await rpc('consultar_evento');
  assert.equal(vitrineAntes.estoque_disponivel, 3);

  assert.deepEqual(await rpc('admin_reiniciar'), { ok: true });

  const painelDepois = await rpc('admin_consultar');
  assert.deepEqual(painelDepois.evento, painelAntes.evento);
  const vitrineDepois = await rpc('consultar_evento');
  assert.deepEqual(vitrineDepois.evento, vitrineAntes.evento);
  assert.equal(vitrineDepois.estoque_disponivel, 8);
  const recusa = { ok: false, motivo: 'sessao_invalida' };
  for (const sessao of [compradora, checkout, semReserva]) {
    assert.deepEqual(await rpc('consultar_evento', { p_sessao_id: sessao }), recusa);
  }
  assert.deepEqual(await reservar(checkout, 1), recusa);
  assert.deepEqual(await confirmar(checkout, ativa.id), recusa);
  assert.deepEqual(await cancelar(checkout, ativa.id), recusa);

  const sessaoNova = await novaSessao('Ana');
  assert.notEqual(sessaoNova, compradora);
  assert.equal((await reservar(sessaoNova, 3)).ok, true);
});

test('operações de estoque na fila atrás do Reinício recusam a Sessão anterior', async () => {
  const sessao = await novaSessao('Ana');
  const checkout = await novaSessao('Bia');
  const ativa = await reservarOk(checkout, 2);

  // Dá tempo para o Reinício entrar na fila do Evento antes das operações de estoque.
  const { liberada } = await segurarTravaDoEvento(800);
  const reinicio = rpc('admin_reiniciar');
  const depoisDoReinicio = esperar(100).then(() => Promise.all([
    reservar(sessao, 1),
    confirmar(checkout, ativa.id),
    cancelar(checkout, ativa.id),
  ]));
  const [resposta, [reserva, pagamento, cancelamento]] = await Promise.all([reinicio, depoisDoReinicio, liberada]);

  assert.deepEqual(resposta, { ok: true });
  const recusa = { ok: false, motivo: 'sessao_invalida' };
  assert.deepEqual(reserva, recusa);
  assert.deepEqual(pagamento, recusa);
  assert.deepEqual(cancelamento, recusa);
  assert.equal((await rpc('consultar_evento')).estoque_disponivel, 8);
});
