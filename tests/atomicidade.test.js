// Atomicidade: uma Falha técnica no meio da transação desfaz a operação inteira.
// A Falha é induzida por um gatilho temporário no banco, sem nenhum código de teste nas funções.
// Comportamento pela chave anon; situação das linhas conferida com privilégio de teste.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  prepararBanco,
  clienteServico,
  rpc,
  novaSessao,
  reservar,
  reservarOk,
  confirmar,
  estoqueVisto,
  ingressosComprometidos,
  induzirFalhaAoInserir,
  removerFalhasInduzidas,
} from './apoio/banco.js';

beforeEach(() => prepararBanco({ capacidade: 10 }));
afterEach(() => removerFalhasInduzidas());

async function situacaoDaReserva(id) {
  const { data, error } = await clienteServico().from('reserva').select('situacao').eq('id', id).single();
  if (error) throw new Error(`lendo reserva: ${error.message}`);
  return data.situacao;
}

test('Falha ao gravar a Venda desfaz a confirmação: Reserva segue ativa e não há Venda', async () => {
  const sessao = await novaSessao();
  const reserva = await reservarOk(sessao, 3);
  await induzirFalhaAoInserir('venda');

  await assert.rejects(confirmar(sessao, reserva.id), /falha induzida/);

  assert.equal(await situacaoDaReserva(reserva.id), 'ativa');
  assert.deepEqual(await ingressosComprometidos(), { vendidos: 0, reservados: 3, reservasAtivas: 1 });
  assert.equal(await estoqueVisto(), 7);
});

test('depois da Falha a mesma Reserva pode ser confirmada e gera uma única Venda', async () => {
  const sessao = await novaSessao();
  const reserva = await reservarOk(sessao, 3);
  await induzirFalhaAoInserir('venda');
  await assert.rejects(confirmar(sessao, reserva.id), /falha induzida/);
  await removerFalhasInduzidas();

  const r = await confirmar(sessao, reserva.id);

  assert.equal(r.ok, true);
  assert.equal(await situacaoDaReserva(reserva.id), 'convertida');
  assert.deepEqual(await ingressosComprometidos(), { vendidos: 3, reservados: 0, reservasAtivas: 0 });
  assert.equal(await estoqueVisto(), 7);
});

test('Falha ao criar a nova Reserva mantém a anterior (ao contrário de uma Recusa)', async () => {
  const sessao = await novaSessao();
  const anterior = await reservarOk(sessao, 2);
  await induzirFalhaAoInserir('reserva');

  await assert.rejects(reservar(sessao, 4), /falha induzida/);

  assert.equal(await situacaoDaReserva(anterior.id), 'ativa');
  const { reserva } = await rpc('consultar_evento', { p_sessao_id: sessao });
  assert.equal(reserva.id, anterior.id);
  assert.deepEqual(await ingressosComprometidos(), { vendidos: 0, reservados: 2, reservasAtivas: 1 });
  assert.equal(await estoqueVisto(), 8);
});

test('Falha não deixa a trava do Evento presa: outra Sessão reserva em seguida', { timeout: 15000 }, async () => {
  const sessao = await novaSessao();
  const reserva = await reservarOk(sessao, 3);
  await induzirFalhaAoInserir('venda');
  await assert.rejects(confirmar(sessao, reserva.id), /falha induzida/);

  const outra = await novaSessao('Outra pessoa');
  const nova = await reservarOk(outra, 5);

  assert.equal(nova.quantidade, 5);
  assert.equal(await estoqueVisto(), 2);
});
