// Apoio dos testes. Dois clientes:
// - clienteAnon(): exatamente o que o navegador usa (chave anon). Asserções de comportamento só usam este.
// - clienteServico(): privilégio de teste (service_role), só para preparar o cenário
//   (configurar o Evento, limpar dados) e para conferências de integridade.
import { createClient } from '@supabase/supabase-js';
import { ambiente } from './ambiente.js';

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

export function clienteAnon() {
  const { url, anon } = ambiente();
  return createClient(url, anon, opcoes);
}

export function clienteServico() {
  const { url, servico } = ambiente();
  return createClient(url, servico, opcoes);
}

// Configuração do Evento usada pelos testes. Cada teste pode sobrescrever campos.
export const EVENTO_TESTE = {
  nome: 'Evento de teste',
  descricao: 'Evento usado pela suíte de testes',
  local: 'Auditório de testes',
  data: '2026-12-12T23:00:00+00:00',
  preco: 50,
  capacidade: 10,
  tempo_reserva_segundos: 120,
  limite_por_reserva: 5,
};

// Apaga Vendas, Reservas e Sessões e aplica a configuração do Evento.
// Chame em beforeEach: os testes rodam em série (--test-concurrency=1) e compartilham o banco.
export async function prepararBanco(evento = {}) {
  const db = clienteServico();
  for (const tabela of ['venda', 'reserva', 'sessao']) {
    const { error } = await db.from(tabela).delete().not('id', 'is', null);
    if (error) throw new Error(`limpando ${tabela}: ${error.message}`);
  }
  const { error } = await db
    .from('evento')
    .update({ ...EVENTO_TESTE, ...evento })
    .eq('id', 1);
  if (error) throw new Error(`configurando evento: ${error.message}`);
}

// Chama uma função RPC como o navegador. Falha (erro do Postgres/rede) vira exceção;
// Recusa e sucesso voltam como dado.
export async function rpc(nome, args = {}, cliente = clienteAnon()) {
  const { data, error } = await cliente.rpc(nome, args);
  if (error) throw new Error(`Falha em ${nome}: ${error.message} (${error.code})`);
  return data;
}

export async function novaSessao(nome = 'Pessoa de teste') {
  const r = await rpc('iniciar_sessao', { p_nome: nome });
  if (!r.ok) throw new Error(`iniciar_sessao recusou: ${r.motivo}`);
  return r.sessao_id;
}
