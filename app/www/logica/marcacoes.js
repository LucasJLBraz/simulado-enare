// Confirmar/contestar comentário. Contestação guarda comentario.versao; versão nova no banco limpa.
const ver = (q) => q.comentario?.versao ?? 1;

export function contestacaoAtiva(q, estado) {
  const c = estado.contestacoes[q.id];
  return !!c && c.versao >= ver(q);
}
export function limparContestacoesAntigas(estado, questoes) {
  for (const q of questoes) {
    const c = estado.contestacoes[q.id];
    if (c && ver(q) > c.versao) delete estado.contestacoes[q.id];
    const k = estado.confirmacoes[q.id];
    if (k && ver(q) > k.versao) delete estado.confirmacoes[q.id];
  }
}
export function marcar(estado, q, tipo) { // tipo: 'confirmar' | 'contestar' | 'limpar'
  delete estado.contestacoes[q.id];
  delete estado.confirmacoes[q.id];
  if (tipo === 'contestar') estado.contestacoes[q.id] = { versao: ver(q) };
  if (tipo === 'confirmar') estado.confirmacoes[q.id] = { versao: ver(q) };
}
