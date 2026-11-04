// Fluxo de telas: nome → vitrine (→ Checkout → Venda, a partir do #6).
// Regras de negócio ficam no banco; aqui só exibimos o que as funções devolvem.
import { api, Falha, quandoSessaoInvalida } from './api.js';
import { sessao } from './sessao.js';

const $ = (id) => document.getElementById(id);

// Texto mostrado para cada motivo de Recusa. Novos motivos (#6 em diante) entram aqui.
const MENSAGENS_RECUSA = {
  nome_invalido: 'Informe um nome (até 80 caracteres).',
  sessao_invalida: 'Sua sessão não existe mais. Informe seu nome de novo.',
};

const TELAS = ['tela-nome', 'tela-vitrine'];

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

function avisarRecusa(motivo) {
  avisar('recusa', 'Pedido recusado', MENSAGENS_RECUSA[motivo] ?? `Motivo: ${motivo}.`);
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
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

// ---- tela de nome ----

function irParaNome() {
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

// ---- vitrine ----

function exibirVitrine(r) {
  const { evento } = r;
  $('evento-nome').textContent = evento.nome;
  $('evento-descricao').textContent = evento.descricao;
  $('evento-local').textContent = evento.local;
  $('evento-data').textContent = dataHora.format(new Date(evento.data));
  $('evento-preco').textContent = moeda.format(evento.preco);
  exibirEstoque(r);
  if (r.sessao) {
    $('saudacao').textContent = `Olá, ${r.sessao.nome}`;
    $('saudacao').hidden = false;
  }
  mostrarTela('tela-vitrine');
}

function exibirEstoque({ estoque_disponivel, esgotado }) {
  $('estoque-disponivel').textContent = String(estoque_disponivel);
  $('esgotado').hidden = !esgotado;
}

// Lê o Evento para a Sessão atual. Recusa sessao_invalida já é tratada em api.js.
async function carregarVitrine() {
  const r = await api.consultarEvento(sessao.id());
  if (!r.ok) {
    if (r.motivo !== 'sessao_invalida') avisarRecusa(r.motivo);
    return;
  }
  exibirVitrine(r);
}

$('botao-atualizar').addEventListener('click', () => {
  limparAviso();
  comBotaoBloqueado($('botao-atualizar'), async () => {
    const r = await api.consultarEvento(sessao.id());
    if (r.ok) exibirEstoque(r);
    else if (r.motivo !== 'sessao_invalida') avisarRecusa(r.motivo);
  });
});

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
