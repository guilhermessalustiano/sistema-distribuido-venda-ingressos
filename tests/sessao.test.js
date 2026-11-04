import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco, rpc, novaSessao, UUID } from './apoio/banco.js';

beforeEach(() => prepararBanco());

test('iniciar_sessao cria uma Sessão e devolve seu id', async () => {
  const r = await rpc('iniciar_sessao', { p_nome: 'Ana' });
  assert.equal(r.ok, true);
  assert.match(r.sessao_id, UUID);
});

test('cada chamada cria uma Sessão diferente, mesmo com o mesmo nome', async () => {
  const a = await novaSessao('Ana');
  const b = await novaSessao('Ana');
  assert.notEqual(a, b);
});

test('a Sessão criada é reconhecida por consultar_evento, com o nome sem espaços nas pontas', async () => {
  const id = await novaSessao('   Ana Souza  ');
  const r = await rpc('consultar_evento', { p_sessao_id: id });
  assert.equal(r.ok, true);
  assert.deepEqual(r.sessao, { id, nome: 'Ana Souza' });
});

for (const [descricao, nome] of [
  ['vazio', ''],
  ['só espaços', '    '],
  ['só tabs e quebras de linha', '\t\n '],
  ['nulo', null],
  ['acima de 80 caracteres', 'x'.repeat(81)],
]) {
  test(`nome ${descricao} gera Recusa nome_invalido`, async () => {
    const r = await rpc('iniciar_sessao', { p_nome: nome });
    assert.deepEqual(r, { ok: false, motivo: 'nome_invalido' });
  });
}

test('nome com exatamente 80 caracteres é aceito', async () => {
  const r = await rpc('iniciar_sessao', { p_nome: 'x'.repeat(80) });
  assert.equal(r.ok, true);
});
