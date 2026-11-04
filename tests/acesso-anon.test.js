// ADR 0001: o navegador (chave anon) não lê nem grava tabelas; só chama as funções publicadas.
// Ao criar uma tabela nova, acrescente-a em TABELAS. Ao publicar uma função nova, acrescente-a em FUNCOES_PUBLICAS.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { clienteAnon, prepararBanco } from './apoio/banco.js';

const TABELAS = ['evento', 'sessao', 'reserva', 'venda'];
const FUNCOES_PUBLICAS = ['iniciar_sessao', 'consultar_evento'];

const anon = clienteAnon();

before(() => prepararBanco());

function assertNegado(resultado, operacao) {
  assert.ok(resultado.error, `${operacao} deveria ser negado, mas devolveu ${JSON.stringify(resultado.data)}`);
  // 42501 = insufficient_privilege; PGRST* = recurso não exposto pela API
  assert.match(String(resultado.error.code), /^(42501|PGRST\d+)$/, `${operacao}: ${resultado.error.message}`);
}

for (const tabela of TABELAS) {
  test(`anon não lê ${tabela}`, async () => {
    assertNegado(await anon.from(tabela).select('*'), `select ${tabela}`);
  });

  test(`anon não insere em ${tabela}`, async () => {
    assertNegado(await anon.from(tabela).insert({}), `insert ${tabela}`);
  });

  test(`anon não altera ${tabela}`, async () => {
    assertNegado(await anon.from(tabela).update({ id: null }).not('id', 'is', null), `update ${tabela}`);
  });

  test(`anon não apaga ${tabela}`, async () => {
    assertNegado(await anon.from(tabela).delete().not('id', 'is', null), `delete ${tabela}`);
  });
}

test('anon não chama funções internas', async () => {
  assertNegado(await anon.rpc('estoque_disponivel'), 'rpc estoque_disponivel');
  assertNegado(await anon.schema('interno').rpc('estoque_disponivel'), 'rpc interno.estoque_disponivel');
});

test('anon chama as funções publicadas', async () => {
  for (const funcao of FUNCOES_PUBLICAS) {
    const { error } = await anon.rpc(funcao, {});
    assert.equal(error, null, `${funcao}: ${error?.message}`);
  }
});
