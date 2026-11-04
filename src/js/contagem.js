// Contagem regressiva até a expiração de uma Reserva, pelo relógio do banco.
// O banco devolve `agora` junto com `expira_em`; o deslocamento entre esse horário e o relógio
// local corrige navegadores com relógio adiantado ou atrasado. O banco continua sendo a autoridade:
// a contagem só decide o que mostrar.

const INTERVALO_MS = 250;

export function criarContagem({ expiraEm, agoraBanco, aoAtualizar, aoZerar }) {
  const deslocamentoMs = Date.parse(agoraBanco) - Date.now();
  const expiraMs = Date.parse(expiraEm);
  const restanteMs = () => Math.max(0, expiraMs - (Date.now() + deslocamentoMs));

  let timer = null;
  const passo = () => {
    const ms = restanteMs();
    aoAtualizar(ms);
    if (ms <= 0) {
      parar();
      aoZerar();
    }
  };
  function parar() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  timer = setInterval(passo, INTERVALO_MS);
  passo();
  return { parar };
}

// 125000 ms → "2:05"
export function formatarRestante(ms) {
  const segundos = Math.ceil(ms / 1000);
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
