// Disputa por estoque entre Sessões simultâneas (ticket #6).
// Cada Sessão usa seu próprio cliente anon, como navegadores em máquinas diferentes.
// Nenhuma chamada pode virar Falha (rpc() lança exceção nesse caso): só sucesso ou Recusa.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  prepararBanco,
  clienteAnon,
  novaSessao,
  reservar,
  estoqueVisto,
  ingressosComprometidos,
} from './apoio/banco.js';

beforeEach(() => prepararBanco());

// Cria as Sessões antes e dispara todos os `reservar` ao mesmo tempo.
async function disputar(quantidades) {
  const sessoes = await Promise.all(quantidades.map((_, i) => novaSessao(`Pessoa ${i + 1}`)));
  const clientes = sessoes.map(() => clienteAnon());
  return Promise.all(quantidades.map((q, i) => reservar(sessoes[i], q, clientes[i])));
}

function separar(respostas) {
  const aceitas = respostas.filter((r) => r.ok);
  const recusas = respostas.filter((r) => !r.ok);
  return { aceitas, recusas };
}

test('último Ingresso disputado por 2 Sessões: 1 Reserva e 1 Recusa', async () => {
  await prepararBanco({ capacidade: 1 });
  const { aceitas, recusas } = separar(await disputar([1, 1]));
  assert.equal(aceitas.length, 1);
  assert.equal(recusas.length, 1);
  assert.deepEqual(recusas[0], { ok: false, motivo: 'estoque_insuficiente', estoque_disponivel: 0 });
  assert.equal(await estoqueVisto(), 0);
  const { reservados } = await ingressosComprometidos();
  assert.equal(reservados, 1);
});

test('Capacidade 10 com 20 Sessões pedindo 1: 10 Reservas e 10 Recusas estoque_insuficiente', async () => {
  await prepararBanco({ capacidade: 10 });
  const { aceitas, recusas } = separar(await disputar(Array(20).fill(1)));
  assert.equal(aceitas.length, 10);
  assert.equal(recusas.length, 10);
  for (const r of recusas) assert.equal(r.motivo, 'estoque_insuficiente');
  assert.equal(await estoqueVisto(), 0);
  const { reservados, reservasAtivas } = await ingressosComprometidos();
  assert.equal(reservados, 10);
  assert.equal(reservasAtivas, 10);
});

test('quantidades mistas 2, 3, 4 e 5 com Capacidade 10: soma reservada nunca passa de 10', async () => {
  await prepararBanco({ capacidade: 10 });
  // Repete algumas rodadas para variar a ordem em que o banco atende as disputas.
  for (let rodada = 0; rodada < 5; rodada++) {
    await prepararBanco({ capacidade: 10 });
    const respostas = await disputar([2, 3, 4, 5]);
    const { aceitas, recusas } = separar(respostas);
    for (const r of recusas) assert.equal(r.motivo, 'estoque_insuficiente');
    const somaAceita = aceitas.reduce((t, r) => t + r.reserva.quantidade, 0);
    assert.ok(somaAceita <= 10, `rodada ${rodada}: reservou ${somaAceita}`);
    assert.ok(recusas.length >= 1, '2+3+4+5 = 14 não cabe em 10');
    const { reservados } = await ingressosComprometidos();
    assert.equal(reservados, somaAceita);
    assert.equal(await estoqueVisto(), 10 - somaAceita);
  }
});

test('a mesma Sessão reservando várias vezes ao mesmo tempo fica com uma única Reserva ativa', async () => {
  await prepararBanco({ capacidade: 10 });
  const id = await novaSessao();
  const respostas = await Promise.all([1, 2, 3, 4, 5].map((q) => reservar(id, q, clienteAnon())));
  assert.ok(respostas.every((r) => r.ok), JSON.stringify(respostas.filter((r) => !r.ok)));
  const { reservasAtivas, reservados } = await ingressosComprometidos();
  assert.equal(reservasAtivas, 1);
  assert.equal(await estoqueVisto(), 10 - reservados);
});

test('muitas Sessões com quantidades variadas nunca passam da Capacidade', async () => {
  await prepararBanco({ capacidade: 10 });
  const quantidades = Array.from({ length: 30 }, (_, i) => (i % 5) + 1);
  const { aceitas, recusas } = separar(await disputar(quantidades));
  for (const r of recusas) assert.equal(r.motivo, 'estoque_insuficiente');
  const somaAceita = aceitas.reduce((t, r) => t + r.reserva.quantidade, 0);
  assert.ok(somaAceita <= 10, `reservou ${somaAceita}`);
  const { reservados, vendidos } = await ingressosComprometidos();
  assert.ok(reservados + vendidos <= 10);
  assert.equal(reservados, somaAceita);
});
