// Única porta do navegador para o banco: funções RPC publicadas (ADR 0001).
// Cada função devolve { ok: true, ... } ou uma Recusa { ok: false, motivo }.
// Qualquer erro do Postgres ou da rede é uma Falha, lançada como exceção `Falha`.
// Para uma função nova (#6 em diante), acrescente um método em `api` chamando `chamar`.
import { config } from './config.js';
import { sessao } from './sessao.js';

let cliente;
function obterCliente() {
  if (!cliente) {
    if (!window.supabase) throw new Falha('Biblioteca supabase-js não carregou (CDN indisponível?).');
    cliente = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}

export class Falha extends Error {
  constructor(mensagem, causa) {
    super(mensagem);
    this.name = 'Falha';
    this.causa = causa;
  }
}

// Chamado quando qualquer função responde `sessao_invalida` (ex.: após um Reinício da demonstração).
let aoInvalidarSessao = () => {};
export function quandoSessaoInvalida(fn) {
  aoInvalidarSessao = fn;
}

async function chamar(funcao, args) {
  const db = obterCliente();
  let resposta;
  try {
    resposta = await db.rpc(funcao, args);
  } catch (e) {
    throw new Falha('Não foi possível conectar ao banco de dados.', e);
  }
  const { data, error } = resposta;
  if (error) {
    // supabase-js devolve erro sem código quando a requisição nem chegou ao banco (rede, CORS, DNS).
    const mensagem = error.code
      ? `O banco de dados respondeu com erro (${error.code}).`
      : 'Não foi possível conectar ao banco de dados.';
    throw new Falha(mensagem, error);
  }
  if (!data || typeof data.ok !== 'boolean') {
    throw new Falha('Resposta inesperada do banco de dados.', data);
  }
  if (!data.ok && data.motivo === 'sessao_invalida') {
    sessao.descartar();
    aoInvalidarSessao();
  }
  return data;
}

// Um método por função RPC (um por linha). confirmar_pagamento (#7) e cancelar_reserva (#8)
// já estão declarados conforme o contrato da spec #3; as funções no banco chegam nesses tickets.
export const api = {
  iniciarSessao: (nome) => chamar('iniciar_sessao', { p_nome: nome }),
  consultarEvento: (sessaoId) => chamar('consultar_evento', sessaoId ? { p_sessao_id: sessaoId } : {}),
  reservar: (sessaoId, quantidade) => chamar('reservar', { p_sessao_id: sessaoId, p_quantidade: quantidade }),
  confirmarPagamento: (sessaoId, reservaId) => chamar('confirmar_pagamento', { p_sessao_id: sessaoId, p_reserva_id: reservaId }),
  cancelarReserva: (sessaoId, reservaId) => chamar('cancelar_reserva', { p_sessao_id: sessaoId, p_reserva_id: reservaId }),
};
