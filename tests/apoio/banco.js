// Apoio dos testes. Dois clientes:
// - clienteAnon(): exatamente o que o navegador usa (chave anon). Asserções de comportamento só usam este.
// - clienteServico(): privilégio de teste (service_role), só para preparar o cenário
//   (configurar o Evento, limpar dados) e para conferências de integridade.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { ambiente } from './ambiente.js';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  await configurarEvento({ ...EVENTO_TESTE, ...evento });
}

// Altera só os campos informados do Evento, sem apagar dados (ex.: mudar o Preço no meio do teste).
export async function configurarEvento(campos) {
  const { error } = await clienteServico().from('evento').update(campos).eq('id', 1);
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

// Cria uma Reserva como o navegador. Devolve a resposta da função (sucesso ou Recusa).
export function reservar(sessaoId, quantidade, cliente) {
  return rpc('reservar', { p_sessao_id: sessaoId, p_quantidade: quantidade }, cliente);
}

// Cria uma Reserva e exige sucesso; devolve o objeto `reserva`.
export async function reservarOk(sessaoId, quantidade) {
  const r = await reservar(sessaoId, quantidade);
  if (!r.ok) throw new Error(`reservar(${quantidade}) recusou: ${r.motivo}`);
  return r.reserva;
}

// Pagamento simulado como o navegador. Devolve a resposta da função (sucesso ou Recusa).
export function confirmar(sessaoId, reservaId, cliente) {
  return rpc('confirmar_pagamento', { p_sessao_id: sessaoId, p_reserva_id: reservaId }, cliente);
}

// Estoque disponível como qualquer Sessão o vê (consultar_evento sem Sessão).
export async function estoqueVisto() {
  const r = await rpc('consultar_evento');
  return r.estoque_disponivel;
}

export const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Privilégio de teste: segura a trava da linha do Evento por `ms` numa transação à parte (psql
// dentro do container do banco local), para que as chamadas feitas nesse intervalo esperem na fila.
// Resolve quando a trava foi obtida; `liberada` resolve quando a transação termina.
// Container: SUPABASE_DB_CONTAINER ou supabase_db_<project_id de supabase/config.toml>.
function containerDoBanco() {
  if (process.env.SUPABASE_DB_CONTAINER) return process.env.SUPABASE_DB_CONTAINER;
  const toml = readFileSync(new URL('../../supabase/config.toml', import.meta.url), 'utf8');
  const projeto = toml.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
  if (!projeto) throw new Error('project_id não encontrado em supabase/config.toml');
  return `supabase_db_${projeto}`;
}

// Privilégio de teste: executa SQL com o papel postgres (psql dentro do container do banco local).
function executarSql(sql) {
  return new Promise((ok, nok) => {
    const psql = spawn('docker', ['exec', '-i', containerDoBanco(), 'psql', '-U', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1'], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let erro = '';
    psql.stderr.on('data', (d) => (erro += d));
    psql.on('error', nok);
    psql.on('exit', (codigo) => (codigo === 0 ? ok() : nok(new Error(`psql saiu com ${codigo}: ${erro}`))));
    psql.stdin.end(sql);
  });
}

// Privilégio de teste: faz todo INSERT em `tabela` ('venda' ou 'reserva') lançar um erro no meio da
// transação das funções, simulando uma Falha técnica. Desfaça com removerFalhasInduzidas no afterEach.
export function induzirFalhaAoInserir(tabela) {
  return executarSql(`
    create or replace function interno.falha_induzida() returns trigger
    language plpgsql set search_path = '' as $$
    begin
      raise exception 'falha induzida';
    end;
    $$;
    create trigger falha_induzida before insert on public.${tabela}
      for each row execute function interno.falha_induzida();
  `);
}

export function removerFalhasInduzidas() {
  return executarSql(`
    drop trigger if exists falha_induzida on public.venda;
    drop trigger if exists falha_induzida on public.reserva;
    drop function if exists interno.falha_induzida();
  `);
}

export function segurarTravaDoEvento(ms) {
  return new Promise((travada, falhou) => {
    const psql = spawn('docker', ['exec', '-i', containerDoBanco(), 'psql', '-U', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let erro = '';
    psql.stderr.on('data', (d) => (erro += d));
    const liberada = new Promise((ok, nok) => {
      psql.on('error', nok);
      psql.on('exit', (codigo) => (codigo === 0 ? ok() : nok(new Error(`psql saiu com ${codigo}: ${erro}`))));
    });
    liberada.catch(falhou);
    psql.stdout.once('data', () => travada({ liberada }));
    psql.stdin.end(
      'begin;\n' +
        "select 'travado' from public.evento where id = 1 for update;\n" +
        `select pg_sleep(${ms / 1000});\n` +
        'commit;\n',
    );
  });
}

// Conferência de integridade com privilégio de teste (separada das asserções de comportamento):
// Ingressos vendidos e Ingressos em Reservas ativas não expiradas, pelo relógio do banco.
export async function ingressosComprometidos() {
  const db = clienteServico();
  const { agora } = await rpc('consultar_evento');
  const vendas = await db.from('venda').select('quantidade');
  if (vendas.error) throw new Error(`lendo venda: ${vendas.error.message}`);
  const reservas = await db
    .from('reserva')
    .select('quantidade')
    .eq('situacao', 'ativa')
    .gt('expira_em', agora);
  if (reservas.error) throw new Error(`lendo reserva: ${reservas.error.message}`);
  const soma = (linhas) => linhas.reduce((t, l) => t + l.quantidade, 0);
  return {
    vendidos: soma(vendas.data),
    reservados: soma(reservas.data),
    reservasAtivas: reservas.data.length,
  };
}
