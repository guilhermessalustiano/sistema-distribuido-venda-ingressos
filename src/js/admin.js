import { api } from './api.js';
import { formatarRestante } from './contagem.js';

const aviso = document.getElementById('aviso');
const status = document.getElementById('status');
const form = document.getElementById('form-configuracao');
const campos = document.getElementById('campos-configuracao');
const botaoAtualizar = document.getElementById('botao-atualizar');
const botaoReiniciar = document.getElementById('botao-reiniciar');
const entradas = Array.from(form.querySelectorAll('input'));
const acompanhamento = document.getElementById('acompanhamento');
const listaReservas = document.getElementById('reservas-ativas');
const listaVendas = document.getElementById('vendas');
const semReservas = document.getElementById('sem-reservas');
const semVendas = document.getElementById('sem-vendas');
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

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

function mostrarAcompanhamento(dados) {
  listaReservas.replaceChildren();
  listaVendas.replaceChildren();

  document.getElementById('vendidos').textContent = dados.vendidos;
  document.getElementById('reservados').textContent = dados.reservados;
  document.getElementById('estoque-disponivel').textContent = dados.estoque_disponivel;
  document.getElementById('quantidade-vendas').textContent = dados.quantidade_vendas;
  document.getElementById('total-arrecadado').textContent = moeda.format(dados.total_arrecadado);

  const agoraBanco = Date.parse(dados.agora);
  for (const reserva of dados.reservas_ativas) {
    const item = document.createElement('li');
    const restante = formatarRestante(Date.parse(reserva.expira_em) - agoraBanco);
    item.textContent = `${reserva.nome_sessao} · Quantidade ${reserva.quantidade} · Restam ${restante}`;
    listaReservas.append(item);
  }
  listaReservas.hidden = dados.reservas_ativas.length === 0;
  semReservas.hidden = !listaReservas.hidden;

  for (const venda of dados.vendas) {
    const item = document.createElement('li');
    item.textContent = `${venda.nome_sessao} · Quantidade ${venda.quantidade} · `
      + `${moeda.format(venda.preco_unitario)} por Ingresso · Total ${moeda.format(venda.total)} · `
      + dataHora.format(new Date(venda.criada_em));
    listaVendas.append(item);
  }
  listaVendas.hidden = dados.vendas.length === 0;
  semVendas.hidden = !listaVendas.hidden;
  acompanhamento.hidden = false;
}

async function carregarPainel() {
  const dados = await api.adminConsultar();
  mostrarConfiguracao(dados.evento);
  mostrarAcompanhamento(dados);
}

async function executar(acao, mensagem) {
  aviso.hidden = true;
  mostrarStatus(mensagem);
  campos.disabled = true;
  botaoAtualizar.disabled = true;
  botaoReiniciar.disabled = true;
  try {
    await acao();
  } catch (falha) {
    mostrarStatus('');
    avisar('Falha', falha.message);
  } finally {
    campos.disabled = false;
    botaoAtualizar.disabled = false;
    botaoReiniciar.disabled = false;
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
    try {
      await carregarPainel();
    } catch (falha) {
      throw new Error(`Configuração salva. Não foi possível atualizar o painel. ${falha.message}`);
    }
    mostrarStatus('Configuração salva.');
  }, 'Salvando configuração…');
});

botaoAtualizar.addEventListener('click', atualizarPainel);

botaoReiniciar.addEventListener('click', () => {
  if (!window.confirm('Apagar todas as Vendas, Reservas e Sessões e reiniciar a demonstração?')) return;

  executar(async () => {
    const resposta = await api.adminReiniciar();
    if (!resposta.ok) {
      mostrarStatus('');
      avisar('Recusa', 'Não foi possível reiniciar a demonstração.');
      return;
    }
    acompanhamento.hidden = true;
    mostrarStatus('Demonstração reiniciada.');
    try {
      await carregarPainel();
    } catch (falha) {
      avisar('Falha', `Não foi possível atualizar o painel. Use “Atualizar painel” para tentar novamente. ${falha.message}`);
    }
  }, 'Reiniciando demonstração…');
});

atualizarPainel();
