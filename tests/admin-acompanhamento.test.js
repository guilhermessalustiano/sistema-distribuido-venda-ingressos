import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { configurarEvento, confirmar, esperar, novaSessao, prepararBanco, reservarOk, rpc } from './apoio/banco.js';

beforeEach(() => prepararBanco());

test('Painel admin soma Ingressos e Vendas no mesmo retrato do Evento', async () => {
  const sessaoVenda = await novaSessao('Pessoa com Venda');
  const reservaVendida = await reservarOk(sessaoVenda, 2);
  assert.equal((await confirmar(sessaoVenda, reservaVendida.id)).ok, true);
  await reservarOk(await novaSessao('Pessoa no Checkout'), 3);

  const painel = await rpc('admin_consultar');
  assert.equal(painel.vendidos, 2);
  assert.equal(painel.reservados, 3);
  assert.equal(painel.estoque_disponivel, 5);
  assert.equal(painel.quantidade_vendas, 1);
  assert.equal(painel.total_arrecadado, '100.00');
  assert.equal(painel.estoque_disponivel, (await rpc('consultar_evento')).estoque_disponivel);
});

test('Painel admin lista apenas Reservas vigentes, com a mesma expiração do Checkout', async () => {
  await configurarEvento({ tempo_reserva_segundos: 1 });
  const expirada = await reservarOk(await novaSessao('Pessoa com Reserva expirada'), 1);
  await esperar(1_100);
  await configurarEvento({ tempo_reserva_segundos: 120 });

  const sessaoCancelada = await novaSessao('Pessoa com Reserva cancelada');
  const cancelada = await reservarOk(sessaoCancelada, 1);
  const resposta = await rpc('cancelar_reserva', {
    p_sessao_id: sessaoCancelada,
    p_reserva_id: cancelada.id,
  });
  assert.equal(resposta.ok, true);

  const sessaoVendida = await novaSessao('Pessoa com Reserva convertida');
  const convertida = await reservarOk(sessaoVendida, 1);
  assert.equal((await confirmar(sessaoVendida, convertida.id)).ok, true);

  const sessaoAtiva = await novaSessao('Pessoa no Checkout');
  await reservarOk(sessaoAtiva, 2);
  const checkout = await rpc('consultar_evento', { p_sessao_id: sessaoAtiva });
  const painel = await rpc('admin_consultar');

  assert.ok(Date.parse(expirada.expira_em) <= Date.parse(painel.agora));
  assert.ok(Date.parse(checkout.agora) <= Date.parse(painel.agora));
  assert.ok(Date.parse(painel.agora) < Date.parse(checkout.reserva.expira_em));
  assert.deepEqual(painel.reservas_ativas, [
    { nome_sessao: 'Pessoa no Checkout', quantidade: 2, expira_em: checkout.reserva.expira_em },
  ]);
  assert.equal(painel.reservados, 2);
});

test('Painel admin mostra o Preço congelado e o horário da Venda após alteração do Evento', async () => {
  const sessao = await novaSessao('Pessoa com Venda');
  const reserva = await reservarOk(sessao, 3);
  const { ok, venda } = await confirmar(sessao, reserva.id);
  assert.equal(ok, true);
  const alteracao = await rpc('admin_atualizar_evento', {
    p_capacidade: 10,
    p_preco: 29.9,
    p_tempo_reserva_segundos: 120,
    p_limite_por_reserva: 5,
  });
  assert.equal(alteracao.ok, true);

  const painel = await rpc('admin_consultar');
  assert.equal(painel.evento.preco, 29.9);
  assert.equal(painel.total_arrecadado, '150.00');
  assert.deepEqual(painel.vendas, [{
    nome_sessao: 'Pessoa com Venda',
    quantidade: 3,
    preco_unitario: 50,
    total: '150.00',
    criada_em: venda.criada_em,
  }]);
});

test('Painel admin preserva os centavos de uma Venda com Preço e Capacidade máximos', async () => {
  const quantidade = 2_147_483_647;
  const alteracao = await rpc('admin_atualizar_evento', {
    p_capacidade: quantidade,
    p_preco: 99_999_999.99,
    p_tempo_reserva_segundos: 120,
    p_limite_por_reserva: quantidade,
  });
  assert.equal(alteracao.ok, true);
  const sessao = await novaSessao('Pessoa com Venda');
  const reserva = await reservarOk(sessao, quantidade);
  assert.equal((await confirmar(sessao, reserva.id)).ok, true);

  const painel = await rpc('admin_consultar');
  assert.equal(painel.total_arrecadado, '214748364678525163.53');
  assert.equal(painel.vendas[0].total, '214748364678525163.53');
});
