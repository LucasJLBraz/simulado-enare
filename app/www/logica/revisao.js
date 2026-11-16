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

// Revisão do dia: ids no caderno com data de revisão hoje ou antes (mais atrasadas primeiro).
export function revisaoDoDia(progresso, hoje) {
  return Object.entries(progresso)
    .filter(([, p]) => p.caderno && p.caderno.proxima <= hoje)
    .sort((a, b) => a[1].caderno.proxima.localeCompare(b[1].caderno.proxima))
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
