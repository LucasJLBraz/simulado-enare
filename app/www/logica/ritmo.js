// Ritmo: tempo por questão comparado ao tempo que a prova dá por questão.
export const refSegPorQuestao = (f) => (f.minutos * 60) / (f.gerais + f.especificos);

export function ritmo(segs, refSeg) {
  const v = segs.filter((s) => Number.isFinite(s) && s > 0);
  if (!v.length) return null;
  const mediaSeg = v.reduce((a, b) => a + b, 0) / v.length;
  const razao = mediaSeg / refSeg;
  const rotulo = razao <= 0.9 ? 'mais rápido que a prova' : razao <= 1.1 ? 'no ritmo da prova' : 'mais lento que a prova';
  return { mediaSeg, refSeg, razao, rotulo };
}

export function ritmoPorTopico(questoes, progresso, refSeg) {
  const segs = {};
  const porId = new Map(questoes.map((q) => [q.id, q]));
  for (const [id, p] of Object.entries(progresso)) {
    const q = porId.get(id);
    if (q) for (const r of p.respostas || []) for (const t of q.topicos) (segs[t] ||= []).push(r.seg);
  }
  return Object.fromEntries(Object.entries(segs).map(([t, s]) => [t, ritmo(s, refSeg)]));
}
