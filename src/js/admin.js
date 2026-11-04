import { api } from './api.js';

const aviso = document.getElementById('aviso');
const status = document.getElementById('status');
const form = document.getElementById('form-configuracao');
const campos = document.getElementById('campos-configuracao');
const botaoAtualizar = document.getElementById('botao-atualizar');
const entradas = Array.from(form.querySelectorAll('input'));

function avisar(tipo, mensagem) {
  aviso.className = `aviso ${tipo.toLowerCase()}`;
  aviso.textContent = `${tipo} — ${mensagem}`;
  aviso.hidden = false;
}

function mostrarStatus(mensagem) {
  status.textContent = mensagem;
  status.hidden = !mensagem;
}

function mostrarConfiguracao(evento) {
  for (const entrada of entradas) entrada.value = evento[entrada.name];
  form.hidden = false;
}

async function carregarPainel() {
  const dados = await api.adminConsultar();
  mostrarConfiguracao(dados.evento);
}

async function executar(acao, mensagem) {
  aviso.hidden = true;
  mostrarStatus(mensagem);
  campos.disabled = true;
  botaoAtualizar.disabled = true;
  try {
    await acao();
  } catch (falha) {
    mostrarStatus('');
    avisar('Falha', falha.message);
  } finally {
    campos.disabled = false;
    botaoAtualizar.disabled = false;
  }
}

function mostrarRecusa(resposta) {
  const entrada = form.elements.namedItem(resposta.campo);
  if (resposta.motivo === 'capacidade_abaixo_do_comprometido') {
    avisar('Recusa', `Capacidade mínima de ${resposta.minimo_capacidade} para manter os Ingressos vendidos e reservados.`);
  } else if (resposta.motivo === 'valor_invalido' && entrada) {
    const nome = entrada.labels[0].textContent;
    const formato = entrada.step === '0.01' ? 'com até duas casas decimais' : 'inteiro';
    avisar('Recusa', `${nome} deve ser um número ${formato} de ${entrada.min} a ${entrada.max}.`);
  } else {
    avisar('Recusa', 'Não foi possível salvar a configuração.');
  }
}

function atualizarPainel() {
  return executar(async () => {
    await carregarPainel();
    mostrarStatus('');
  }, 'Carregando painel…');
}

form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const configuracao = Object.fromEntries(entradas.map((entrada) => [
    entrada.name,
    Number.isFinite(entrada.valueAsNumber) ? entrada.valueAsNumber : null,
  ]));

  executar(async () => {
    const resposta = await api.adminAtualizarEvento(configuracao);
    if (!resposta.ok) {
      mostrarStatus('');
      mostrarRecusa(resposta);
      return;
    }
    mostrarConfiguracao(resposta.evento);
    mostrarStatus('Configuração salva.');
  }, 'Salvando configuração…');
});

botaoAtualizar.addEventListener('click', atualizarPainel);
atualizarPainel();
