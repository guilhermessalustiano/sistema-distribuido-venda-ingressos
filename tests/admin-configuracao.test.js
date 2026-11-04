import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { confirmar, novaSessao, prepararBanco, reservar, reservarOk, rpc } from './apoio/banco.js';

const configuracao = {
  capacidade: 12,
  preco: 23.45,
  tempo_reserva_segundos: 45,
  limite_por_reserva: 4,
};

function atualizar(campos = configuracao) {
  return rpc('admin_atualizar_evento', {
    p_capacidade: campos.capacidade,
    p_preco: campos.preco,
    p_tempo_reserva_segundos: campos.tempo_reserva_segundos,
    p_limite_por_reserva: campos.limite_por_reserva,
  });
}

beforeEach(() => prepararBanco());

test('Painel admin salva os quatro campos de uma vez e a vitrine reflete a alteração', async () => {
  const antes = await rpc('admin_consultar');
  assert.equal(antes.ok, true);
  assert.equal(antes.evento.capacidade, 10);
  assert.equal(antes.evento.preco, 50);
  assert.equal(antes.evento.tempo_reserva_segundos, 120);
  assert.equal(antes.evento.limite_por_reserva, 5);

  const salvo = await atualizar();
  assert.deepEqual(salvo, { ok: true, evento: configuracao });
  const painel = await rpc('admin_consultar');
  assert.deepEqual(painel.evento, configuracao);

  const vitrine = await rpc('consultar_evento');
  assert.equal(vitrine.estoque_disponivel, 12);
  assert.equal(vitrine.evento.preco, 23.45);
  assert.equal(vitrine.evento.limite_por_reserva, 4);
});

for (const [campo, invalidos] of Object.entries({
  capacidade: [-1, 2.5, 2147483648, '12', null, undefined],
  preco: [-1, 1.234, 100000000, '23.45', null, undefined],
  tempo_reserva_segundos: [0, -1, 2.5, 2147483648, '45', null, undefined],
  limite_por_reserva: [0, -1, 2.5, 2147483648, true, null, undefined],
})) {
  test(`recusa ${campo} inválido sem alterar a configuração`, async () => {
    const { evento: antes } = await rpc('admin_consultar');
    for (const valor of invalidos) {
      const resposta = await atualizar({ ...configuracao, [campo]: valor });
      assert.deepEqual(resposta, {
        ok: false,
        motivo: 'valor_invalido',
        campo,
        minimo_capacidade: null,
      }, JSON.stringify({ campo, valor }));
      const { evento } = await rpc('admin_consultar');
      assert.deepEqual(evento, antes);
    }
  });
}

test('Capacidade mínima inclui Ingressos vendidos e em Reservas ativas', async () => {
  const sessaoVenda = await novaSessao('Pessoa com Venda');
  const reservaVendida = await reservarOk(sessaoVenda, 2);
  assert.equal((await confirmar(sessaoVenda, reservaVendida.id)).ok, true);
  await reservarOk(await novaSessao('Pessoa no Checkout'), 3);

  const { evento: antes } = await rpc('admin_consultar');
  assert.deepEqual(await atualizar({ ...configuracao, capacidade: 4 }), {
    ok: false,
    motivo: 'capacidade_abaixo_do_comprometido',
    campo: 'capacidade',
    minimo_capacidade: 5,
  });
  assert.deepEqual((await rpc('admin_consultar')).evento, antes);

  const resposta = await atualizar({ ...configuracao, capacidade: 5 });
  assert.equal(resposta.ok, true);
  assert.equal(resposta.evento.capacidade, 5);
  assert.equal((await rpc('consultar_evento')).estoque_disponivel, 0);
});

test('Checkout mantém o Preço, a expiração e a quantidade anteriores à configuração nova', async () => {
  const sessao = await novaSessao();
  const anterior = await reservarOk(sessao, 3);
  assert.equal(anterior.preco_unitario, 50);

  assert.equal((await atualizar({
    capacidade: 12,
    preco: 15.25,
    tempo_reserva_segundos: 30,
    limite_por_reserva: 1,
  })).ok, true);

  const checkout = await rpc('consultar_evento', { p_sessao_id: sessao });
  assert.deepEqual(checkout.reserva, anterior);
  const venda = await confirmar(sessao, anterior.id);
  assert.equal(venda.ok, true);
  assert.equal(venda.venda.quantidade, 3);
  assert.equal(venda.venda.preco_unitario, 50);
  assert.equal(venda.venda.total, 150);

  const nova = await novaSessao();
  assert.equal((await reservar(nova, 2)).motivo, 'limite_excedido');
  const resposta = await reservar(nova, 1);
  assert.equal(resposta.ok, true);
  assert.equal(resposta.reserva.preco_unitario, 15.25);
  assert.equal(Date.parse(resposta.reserva.expira_em) - Date.parse(resposta.agora), 30_000);
});

test('reduzir Capacidade enquanto Sessões reservam preserva os Ingressos comprometidos', async () => {
  const vendida = await novaSessao('Pessoa com Venda');
  const reserva = await reservarOk(vendida, 2);
  assert.equal((await confirmar(vendida, reserva.id)).ok, true);
  const sessoes = await Promise.all(Array.from({ length: 8 }, (_, i) => novaSessao(`Pessoa ${i + 1}`)));

  const [alteracao, ...respostas] = await Promise.all([
    atualizar({ ...configuracao, capacidade: 4 }),
    ...sessoes.map((sessao) => reservar(sessao, 2)),
  ]);
  const vendidos = 2;
  const reservados = respostas.filter((r) => r.ok).reduce((soma, r) => soma + r.reserva.quantidade, 0);
  for (const resposta of respostas.filter((r) => !r.ok)) {
    assert.equal(resposta.motivo, 'estoque_insuficiente');
  }
  if (!alteracao.ok) assert.equal(alteracao.motivo, 'capacidade_abaixo_do_comprometido');

  const { evento } = await rpc('admin_consultar');
  assert.equal(evento.capacidade, alteracao.ok ? 4 : 10);
  assert.ok(vendidos + reservados <= evento.capacidade);
  assert.equal((await rpc('consultar_evento')).estoque_disponivel, evento.capacidade - vendidos - reservados);
});

test('Pagamento simulado aceita total acima do limite anterior após configurar Preço e Capacidade altos', async () => {
  const resposta = await atualizar({
    capacidade: 101,
    preco: 99999999.99,
    tempo_reserva_segundos: 120,
    limite_por_reserva: 101,
  });
  assert.equal(resposta.ok, true);

  const sessao = await novaSessao();
  const reserva = await reservarOk(sessao, 101);
  const venda = await confirmar(sessao, reserva.id);
  assert.equal(venda.ok, true);
  assert.equal(venda.venda.total, 10099999998.99);
});
