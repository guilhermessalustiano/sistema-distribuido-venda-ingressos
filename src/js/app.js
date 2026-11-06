// Fluxo de telas: nome → vitrine/seleção → Checkout → Venda.
// Regras de negócio ficam no banco; aqui só exibimos o que as funções devolvem.
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
  reserva_expirada: 'Reserva expirada: o Tempo de reserva acabou e os Ingressos voltaram ao Estoque disponível.',
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
  $('ingresso').hidden = false;
  $('ingresso').classList.toggle('sem-evento', !eventoAtual);
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
  avisar('recusa', 'Recusa', detalheExtra ? `${texto} ${detalheExtra}` : texto);
}

// Recusa sessao_invalida já levou à tela de nome (api.js, quandoSessaoInvalida): quem chamou só para.
function sessaoInvalidada(r) {
  return !r.ok && r.motivo === 'sessao_invalida';
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
  }
}

// ---- formatação ----

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const data = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'America/Sao_Paulo',
});
const hora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

// A contagem do Checkout muda de cor quando falta pouco para a Reserva expirar.
const URGENTE_MS = 30_000;

// ---- estado da página ----

// Último Evento lido (Preço e Limite por reserva para o total da seleção).
let eventoAtual = null;
let esgotadoAtual = false;
// Reserva ativa da Sessão e a contagem regressiva dela.
let reserva = null;
let contagem = null;

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
  $('evento-data').textContent = data.format(new Date(evento.data)).replaceAll('.', '');
  $('evento-hora').textContent = hora.format(new Date(evento.data));
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
  const limite = eventoAtual?.limite_por_reserva ?? 1;
  const valida = Number.isInteger(q) && q >= 1 && eventoAtual && q <= limite;
  $('selecao-total').textContent = valida ? moeda.format(q * eventoAtual.preco) : '—';
  $('botao-menos').disabled = !(q > 1);
  $('botao-mais').disabled = Number.isFinite(q) && q >= limite;
}

// Os botões − e + mantêm a quantidade entre 1 e o Limite por reserva; digitar continua possível.
function ajustarQuantidade(delta) {
  const atual = quantidadeDigitada();
  const base = Number.isFinite(atual) ? Math.round(atual) : 0;
  const limite = eventoAtual?.limite_por_reserva ?? 1;
  $('campo-quantidade').value = String(Math.min(limite, Math.max(1, base + delta)));
  atualizarTotalSelecao();
}

$('campo-quantidade').addEventListener('input', atualizarTotalSelecao);
$('botao-menos').addEventListener('click', () => ajustarQuantidade(-1));
$('botao-mais').addEventListener('click', () => ajustarQuantidade(1));

// Mostra a vitrine/seleção; se houver Reserva ativa, avisa que reservar de novo a substitui.
function irParaSelecao() {
  $('reserva-pendente').hidden = !reserva;
  if (reserva) $('pendente-quantidade').textContent = String(reserva.quantidade);
  atualizarBotaoReservar();
  mostrarTela('tela-vitrine');
}

// Lê o Evento para a Sessão atual e vai para o Checkout (se houver Reserva ativa) ou para a seleção.
async function carregarVitrine() {
  const r = await api.consultarEvento(sessao.id());
  if (sessaoInvalidada(r)) return;
  if (!r.ok) return avisarRecusa(r.motivo);
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
    if (sessaoInvalidada(r)) return;
    if (r.ok) exibirEstoque(r);
    else avisarRecusa(r.motivo);
  });
});

// `pendente` impede que exibirEstoque reabilite o botão no meio da chamada.
$('form-reserva').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparAviso();
  const botao = $('botao-reservar');
  botao.dataset.pendente = 'sim';
  await comBotaoBloqueado(botao, async () => {
    const r = await api.reservar(sessao.id(), quantidadeDigitada());
    if (r.ok) {
      exibirEstoque({ estoque_disponivel: r.estoque_disponivel });
      irParaCheckout(r.reserva, r.agora);
      return;
    }
    if (sessaoInvalidada(r)) return;
    // Com a Sessão válida, a Recusa também cancelou a Reserva anterior (spec #3): esquece a local
    // e relê a vitrine, já com os Ingressos dela de volta ao Estoque disponível.
    sairDoCheckout();
    avisarRecusa(
      r.motivo,
      r.motivo === 'estoque_insuficiente' ? `Estoque disponível agora: ${r.estoque_disponivel}.` : '',
    );
    await carregarVitrine();
  });
  delete botao.dataset.pendente;
  atualizarBotaoReservar();
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
  $('contagem').classList.toggle('urgente', ms <= URGENTE_MS);
}

// Entra no Checkout com a Reserva devolvida pelo banco (por reservar ou consultar_evento).
// `agora` é o horário do banco na mesma resposta, usado para corrigir o relógio local.
function irParaCheckout(novaReserva, agora) {
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
function sairDoCheckout() {
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

// ---- Checkout: confirmar ----

function exibirVenda(venda) {
  $('venda-quantidade').textContent = String(venda.quantidade);
  $('venda-total').textContent = moeda.format(venda.total);
  $('venda-id').textContent = venda.id;
  mostrarTela('tela-venda');
}

// O banco é a autoridade do prazo: mesmo com a contagem ainda positiva, pode recusar reserva_expirada.
$('botao-confirmar').addEventListener('click', () => {
  limparAviso();
  const atual = reserva;
  if (!atual) return;
  comBotaoBloqueado($('botao-confirmar'), async () => {
    const r = await api.confirmarPagamento(sessao.id(), atual.id);
    if (r.ok) {
      sairDoCheckout();
      exibirEstoque({ estoque_disponivel: r.estoque_disponivel });
      exibirVenda(r.venda);
      return;
    }
    if (sessaoInvalidada(r)) return;
    // Expirada, já finalizada ou inexistente: a Reserva local não vale mais; volta à seleção.
    sairDoCheckout();
    avisarRecusa(r.motivo);
    await carregarVitrine();
  });
});

$('botao-voltar-evento').addEventListener('click', () => {
  limparAviso();
  comBotaoBloqueado($('botao-voltar-evento'), carregarVitrine);
});

// ---- Checkout: cancelar ----

// Cancela a Reserva e volta à seleção com o Estoque disponível relido do banco.
// cancelar_reserva é idempotente: Reserva já cancelada também volta como sucesso.
$('botao-cancelar').addEventListener('click', () => {
  limparAviso();
  const atual = reserva;
  if (!atual) return;
  comBotaoBloqueado($('botao-cancelar'), async () => {
    const r = await api.cancelarReserva(sessao.id(), atual.id);
    if (sessaoInvalidada(r)) return;
    sairDoCheckout();
    if (!r.ok) avisarRecusa(r.motivo);
    await carregarVitrine();
  });
});

// ---- início ----

// Sem Sessão, o Evento já aparece no Ingresso enquanto a pessoa informa o nome.
async function iniciar() {
  try {
    if (!sessao.id()) {
      // Se o Evento não carregar, a tela de nome aparece mesmo assim (só sem o canhoto).
      const r = await api.consultarEvento(null).catch((erro) => console.error(erro));
      if (r?.ok) exibirVitrine(r);
      return irParaNome();
    }
    await carregarVitrine();
  } catch (erro) {
    $('carregando').hidden = true;
    avisarFalha(erro);
  }
}

iniciar();
