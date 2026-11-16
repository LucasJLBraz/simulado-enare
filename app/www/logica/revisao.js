// Caderno de erros e intervalo de revisão. Datas são strings 'AAAA-MM-DD'.
export const DIAS_SEM_PROVA = 7;

export const hojeISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const utc = (s) => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
export const diasEntre = (de, ate) => Math.round((utc(ate) - utc(de)) / 864e5);
export const somaDias = (s, n) => new Date(utc(s) + n * 864e5).toISOString().slice(0, 10);

// round(0,15 x dias até a prova), entre 1 e 30. Sem data (ou prova já passada): 7.
export function intervaloDias(diasAteProva) {
  if (diasAteProva == null || !Number.isFinite(diasAteProva) || diasAteProva < 0) return DIAS_SEM_PROVA;
  return Math.min(30, Math.max(1, Math.round(0.15 * diasAteProva)));
}

// Devolve a nova entrada do caderno (ou null se a questão sai / não entra).
// entrada: entrada atual do caderno ou null. conf: 'chutei' | 'duvida' | 'certeza'.
export function atualizarCaderno(entrada, { certo, conf }, hoje, diasAteProva) {
  if (certo && conf === 'certeza') return null;
  const dias = !certo && entrada ? 1 : intervaloDias(diasAteProva); // errar de novo: dia seguinte
  return { proxima: somaDias(hoje, dias), destaque: !certo && conf === 'certeza' };
}

// Revisão do dia: ids no caderno com data de revisão hoje ou antes.
// Erros com certeza primeiro, depois os mais atrasados.
export function revisaoDoDia(progresso, hoje) {
  return Object.entries(progresso)
    .filter(([, p]) => p.caderno && p.caderno.proxima <= hoje)
    .sort((a, b) => (b[1].caderno.destaque ? 1 : 0) - (a[1].caderno.destaque ? 1 : 0) || a[1].caderno.proxima.localeCompare(b[1].caderno.proxima))
    .map(([id]) => id);
}

export const SEG_PADRAO = 180;
export function minutosEstimados(ids, progresso) {
  const total = ids.reduce((s, id) => {
    const r = progresso[id]?.respostas ?? [];
    return s + (r.length ? r[r.length - 1].seg || SEG_PADRAO : SEG_PADRAO);
  }, 0);
  return Math.ceil(total / 60);
}

// Destino da questão no caderno depois de uma resposta, pela mesma regra de atualizarCaderno.
export function destinoCaderno(entrada, resposta, hoje, diasAteProva) {
  const novo = atualizarCaderno(entrada, resposta, hoje, diasAteProva);
  return novo
    ? { volta: true, estava: !!entrada, dias: diasEntre(hoje, novo.proxima), proxima: novo.proxima }
    : { volta: false, estava: !!entrada };
}

const dizerConf = { certeza: 'com certeza', duvida: 'com dúvida', chutei: 'chutando' };
// Faixa de feedback: resultado, confiança e o destino real no caderno.
export function mensagemFeedback({ certo, conf }, destino) {
  const quando = destino.dias === 1 ? 'amanhã' : `em ${destino.dias} dias`;
  const fim = destino.volta ? `Volta ${quando} no caderno de erros.`
    : destino.estava ? 'Sai do caderno de erros.' : 'Não volta para revisão.';
  return `${certo ? 'Acertou' : 'Errou'} ${dizerConf[conf]}. ${fim}`;
}

export const dataCurta = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`;

// Caderno inteiro: quantas questões e quando vence a primeira.
export function resumoCaderno(progresso) {
  const datas = Object.values(progresso).map((p) => p.caderno?.proxima).filter(Boolean).sort();
  return { n: datas.length, proxima: datas[0] ?? null };
}
export function fraseCaderno({ n, proxima }, hoje) {
  if (!n) return null;
  return `No caderno: ${n} ${n === 1 ? 'questão' : 'questões'}. Próxima revisão: ${proxima <= hoje ? 'hoje' : dataCurta(proxima)}.`;
}

// Meta do dia: quantas já foram revisadas hoje de quantas venciam. rev: estado.revisaoHoje.
export function metaHoje(rev, vencidas, hoje) {
  const feitas = rev?.data === hoje ? rev.feitas : 0;
  return { feitas, total: feitas + vencidas };
}

// O que muda amanhã depois da revisão. ids: questões da sessão; progresso já atualizado.
export function fraseAmanha(progresso, ids, hoje) {
  const amanha = somaDias(hoje, 1);
  const voltam = ids.filter((id) => progresso[id]?.caderno).map((id) => progresso[id].caderno.proxima).sort();
  const saem = ids.filter((id) => progresso[id] && !progresso[id].caderno).length;
  const nAmanha = Object.values(progresso).filter((p) => p.caderno && p.caderno.proxima <= amanha).length;
  const s = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  return [
    saem && `${s(saem, 'questão saiu', 'questões saíram')} do caderno (acerto com certeza).`,
    voltam.length && `${s(voltam.length, 'questão volta', 'questões voltam')} para revisão, a primeira ${voltam[0] <= amanha ? 'amanhã' : `em ${dataCurta(voltam[0])}`}.`,
    nAmanha ? `Amanhã: ${s(nAmanha, 'questão', 'questões')} para revisar.` : 'Amanhã: nenhuma questão para revisar.',
  ].filter(Boolean);
}
