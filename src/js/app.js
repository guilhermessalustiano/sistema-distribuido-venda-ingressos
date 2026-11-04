// Fluxo de telas: nome → vitrine/seleção → Checkout → Venda.
// Regras de negócio ficam no banco; aqui só exibimos o que as funções devolvem.
//
// Pontos de extensão para os tickets seguintes (cada um em sua seção, para não conflitar):
//   #7 (confirmar_pagamento): seção "---- Checkout: confirmar (#7) ----" e a tela #tela-venda.
//   #8 (cancelar_reserva):    seção "---- Checkout: cancelar (#8) ----".
// Use reservaAtual(), sairDoCheckout(), irParaSelecao() e carregarVitrine() em vez de mexer no estado direto.
import { api, Falha, quandoSessaoInvalida } from './api.js';
import { sessao } from './sessao.js';
import { criarContagem, formatarRestante } from './contagem.js';

const $ = (id) => document.getElementById(id);

// Texto mostrado para cada motivo de Recusa (um por linha).
const MENSAGENS_RECUSA = {
  nome_invalido: 'Informe um nome (até 80 caracteres).',
  sessao_invalida: 'Sua sessão não existe mais. Informe seu nome de novo.',
  quantidade_invalida: 'Informe uma quantidade inteira a partir de 1.',
  limite_excedido: 'A quantidade passa do Limite por reserva.',
  estoque_insuficiente: 'Não há Ingressos suficientes no Estoque disponível.',
  reserva_expirada: 'Reserva expirada: o Tempo de reserva acabou e os Ingressos voltaram ao estoque.',
  reserva_inexistente: 'Essa Reserva não existe (ou não é desta sessão).',
  reserva_ja_finalizada: 'Essa Reserva já foi cancelada ou confirmada.',
};

// Uma tela por linha.
const TELAS = [
  'tela-nome',
  'tela-vitrine',
  'tela-checkout',
  'tela-venda',
];

function mostrarTela(id) {
  $('carregando').hidden = true;
  for (const tela of TELAS) $(tela).hidden = tela !== id;
}

// ---- mensagens ----

function limparAviso() {
  $('aviso').hidden = true;
  $('aviso').className = 'aviso';
  $('aviso').replaceChildren();
}

function avisar(tipo, titulo, detalhe) {
  const aviso = $('aviso');
  aviso.className = `aviso ${tipo}`;
  const forte = document.createElement('strong');
  forte.textContent = titulo;
  const texto = document.createElement('span');
  texto.textContent = detalhe;
  aviso.replaceChildren(forte, texto);
  aviso.hidden = false;
}

function avisarRecusa(motivo, detalheExtra = '') {
  const texto = MENSAGENS_RECUSA[motivo] ?? `Motivo: ${motivo}.`;
  avisar('recusa', 'Pedido recusado', detalheExtra ? `${texto} ${detalheExtra}` : texto);
}

function avisarFalha(erro) {
  console.error(erro, erro?.causa);
  avisar(
    'falha',
    'Falha técnica',
    `${erro instanceof Falha ? erro.message : 'Erro inesperado.'} ` +
      'Isso não é falta de Ingressos: verifique sua conexão e tente de novo.',
  );
}

// Executa uma chamada com o botão bloqueado enquanto ela está pendente.
async function comBotaoBloqueado(botao, acao) {
  botao.disabled = true;
  try {
    await acao();
  } catch (erro) {
    avisarFalha(erro);
  } finally {
    botao.disabled = false;
    atualizarBotaoReservar();
  }
}

// ---- formatação ----

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

// ---- estado da página ----

// Último Evento lido (Preço e Limite por reserva para o total da seleção).
let eventoAtual = null;
let esgotadoAtual = false;
// Reserva ativa da Sessão e a contagem regressiva dela.
let reserva = null;
let contagem = null;

export function reservaAtual() {
  return reserva;
}

// ---- tela de nome ----

function irParaNome() {
  sairDoCheckout();
  $('saudacao').hidden = true;
  mostrarTela('tela-nome');
  $('campo-nome').focus();
}

quandoSessaoInvalida(() => {
  irParaNome();
  avisarRecusa('sessao_invalida');
});

$('form-nome').addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparAviso();
  const nome = $('campo-nome').value.trim();
  if (!nome) {
    avisarRecusa('nome_invalido');
    return;
  }
  comBotaoBloqueado($('botao-entrar'), async () => {
    const r = await api.iniciarSessao(nome);
    if (!r.ok) return avisarRecusa(r.motivo);
    sessao.guardar(r.sessao_id);
    await carregarVitrine();
  });
});

// ---- vitrine e seleção ----

function exibirVitrine(r) {
  const { evento } = r;
  eventoAtual = evento;
  $('evento-nome').textContent = evento.nome;
  $('evento-descricao').textContent = evento.descricao;
  $('evento-local').textContent = evento.local;
  $('evento-data').textContent = dataHora.format(new Date(evento.data));
  $('evento-preco').textContent = moeda.format(evento.preco);
  $('limite-por-reserva').textContent = String(evento.limite_por_reserva);
  $('campo-quantidade').max = String(evento.limite_por_reserva);
  exibirEstoque(r);
  atualizarTotalSelecao();
  if (r.sessao) {
    $('saudacao').textContent = `Olá, ${r.sessao.nome}`;
    $('saudacao').hidden = false;
  }
}

function exibirEstoque({ estoque_disponivel, esgotado }) {
  esgotadoAtual = esgotado ?? estoque_disponivel === 0;
  $('estoque-disponivel').textContent = String(estoque_disponivel);
  $('esgotado').hidden = !esgotadoAtual;
  atualizarBotaoReservar();
}

// Com Esgotado não adianta reservar, a não ser para substituir a própria Reserva.
function atualizarBotaoReservar() {
  const botao = $('botao-reservar');
  if (botao.dataset.pendente === 'sim') return;
  botao.disabled = esgotadoAtual && !reserva;
}

// Quantidade digitada: número se for número, null se vazio. A validação é do banco.
function quantidadeDigitada() {
  const texto = $('campo-quantidade').value.trim();
  return texto === '' ? null : Number(texto);
}

function atualizarTotalSelecao() {
  const q = quantidadeDigitada();
  const valida = Number.isInteger(q) && q >= 1 && eventoAtual && q <= eventoAtual.limite_por_reserva;
  $('selecao-total').textContent = valida ? moeda.format(q * eventoAtual.preco) : '—';
}

$('campo-quantidade').addEventListener('input', atualizarTotalSelecao);

// Mostra a vitrine/seleção; se houver Reserva ativa, avisa que reservar de novo a substitui.
export function irParaSelecao() {
  $('reserva-pendente').hidden = !reserva;
  if (reserva) $('pendente-quantidade').textContent = String(reserva.quantidade);
  atualizarBotaoReservar();
  mostrarTela('tela-vitrine');
}

// Lê o Evento para a Sessão atual e vai para o Checkout (se houver Reserva ativa) ou para a seleção.
// Recusa sessao_invalida já é tratada em api.js.
export async function carregarVitrine() {
  const r = await api.consultarEvento(sessao.id());
  if (!r.ok) {
    if (r.motivo !== 'sessao_invalida') avisarRecusa(r.motivo);
    return;
  }
  exibirVitrine(r);
  if (r.reserva) irParaCheckout(r.reserva, r.agora);
  else {
    sairDoCheckout();
    irParaSelecao();
  }
}

$('botao-atualizar').addEventListener('click', () => {
  limparAviso();
  comBotaoBloqueado($('botao-atualizar'), async () => {
    const r = await api.consultarEvento(sessao.id());
    if (r.ok) exibirEstoque(r);
    else if (r.motivo !== 'sessao_invalida') avisarRecusa(r.motivo);
  });
});

$('form-reserva').addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparAviso();
  const botao = $('botao-reservar');
  botao.dataset.pendente = 'sim';
  comBotaoBloqueado(botao, async () => {
    try {
      const r = await api.reservar(sessao.id(), quantidadeDigitada());
      if (r.ok) {
        exibirEstoque({ estoque_disponivel: r.estoque_disponivel });
        irParaCheckout(r.reserva, r.agora);
        return;
      }
      if (r.motivo === 'sessao_invalida') return;
      if (r.motivo === 'estoque_insuficiente') {
        exibirEstoque({ estoque_disponivel: r.estoque_disponivel });
        avisarRecusa(r.motivo, `Estoque disponível agora: ${r.estoque_disponivel}.`);
        return;
      }
      avisarRecusa(r.motivo);
    } finally {
      delete botao.dataset.pendente;
    }
  });
});

$('botao-voltar-checkout').addEventListener('click', () => {
  limparAviso();
  if (reserva) mostrarTela('tela-checkout');
});

// ---- Checkout ----

function exibirRestante(ms) {
  const texto = formatarRestante(ms);
  $('checkout-contagem').textContent = texto;
  $('pendente-contagem').textContent = texto;
}

// Entra no Checkout com a Reserva devolvida pelo banco (por reservar ou consultar_evento).
// `agora` é o horário do banco na mesma resposta, usado para corrigir o relógio local.
export function irParaCheckout(novaReserva, agora) {
  sairDoCheckout();
  reserva = novaReserva;
  $('checkout-quantidade').textContent = String(reserva.quantidade);
  $('checkout-preco').textContent = moeda.format(reserva.preco_unitario);
  $('checkout-total').textContent = moeda.format(reserva.total);
  // Mostra antes de contar: se já tiver expirado, aoExpirar (chamado na hora) leva à seleção.
  mostrarTela('tela-checkout');
  contagem = criarContagem({
    expiraEm: reserva.expira_em,
    agoraBanco: agora,
    aoAtualizar: exibirRestante,
    aoZerar: aoExpirar,
  });
}

// Esquece a Reserva local e para a contagem (após expirar, cancelar, confirmar ou trocar de Sessão).
export function sairDoCheckout() {
  contagem?.parar();
  contagem = null;
  reserva = null;
}

// Contagem zerou: avisa e volta à seleção com o Estoque disponível atualizado.
function aoExpirar() {
  sairDoCheckout();
  irParaSelecao();
  avisarRecusa('reserva_expirada');
  carregarVitrine().catch(avisarFalha);
}

$('botao-voltar-selecao').addEventListener('click', () => {
  limparAviso();
  irParaSelecao();
});

// ---- Checkout: confirmar (#7) ----

// ---- Checkout: cancelar (#8) ----

// ---- início ----

async function iniciar() {
  if (!sessao.id()) return irParaNome();
  try {
    await carregarVitrine();
  } catch (erro) {
    $('carregando').hidden = true;
    avisarFalha(erro);
  }
}

iniciar();
