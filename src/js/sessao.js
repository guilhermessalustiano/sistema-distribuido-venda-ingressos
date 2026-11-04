// Id da Sessão no sessionStorage: sobrevive ao reload, mas cada aba nova começa sem Sessão.
// (Atenção: "Duplicar aba" no navegador copia o sessionStorage e, portanto, a Sessão.)
const CHAVE = 'venda-ingressos:sessao_id';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cópia em memória caso o sessionStorage esteja bloqueado (a Sessão então vale só até o reload).
let memoria = null;

export const sessao = {
  // Devolve o id guardado, ou null. Um valor adulterado (não-UUID) é descartado.
  id() {
    let valor = memoria;
    try {
      valor = sessionStorage.getItem(CHAVE) ?? memoria;
    } catch {
      /* usa a memória */
    }
    if (valor && !UUID.test(valor)) {
      this.descartar();
      return null;
    }
    return valor;
  },
  guardar(id) {
    memoria = id;
    try {
      sessionStorage.setItem(CHAVE, id);
    } catch {
      /* usa a memória */
    }
  },
  descartar() {
    memoria = null;
    try {
      sessionStorage.removeItem(CHAVE);
    } catch {
      /* nada a fazer */
    }
  },
};
