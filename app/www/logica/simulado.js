import { sortear } from './sorteio.js';

export const MIN_POR_QUESTAO = 3;
export const ehEnare = (q) => q.origem.tipo === 'oficial' && q.origem.exame === 'ENARE';

// Simulado montado: 20 gerais + 80 específicos do ENARE oficial (apostila nunca entra).
export function montar(questoes, vistos, formato, rng = Math.random) {
  const enare = questoes.filter(ehEnare);
  const g = sortear(enare.filter((q) => q.parte === 'gerais'), vistos, formato.gerais, rng);
  const e = sortear(enare.filter((q) => q.parte === 'especificos'), vistos, formato.especificos, rng);
  return { questoes: [...g, ...e], faltam: { gerais: formato.gerais - g.length, especificos: formato.especificos - e.length } };
}

export function edicoes(questoes) {
  const m = {};
  for (const q of questoes.filter(ehEnare)) (m[q.origem.edicao] ||= []).push(q);
  return Object.entries(m).map(([edicao, qs]) => ({ edicao, n: qs.length })).sort((a, b) => b.edicao.localeCompare(a.edicao));
}

// Prova real: todas as questões não anuladas da edição, na ordem original.
export const provaReal = (questoes, edicao) =>
  questoes.filter((q) => ehEnare(q) && q.origem.edicao === edicao)
    .sort((a, b) => a.origem.prova.localeCompare(b.origem.prova) || a.origem.numero - b.origem.numero);

export const tempoTotalPadrao = (n, minPorQuestao = MIN_POR_QUESTAO) => Math.round(n * minPorQuestao * 60);

// Avisos aos 30 e 10 minutos finais. Devolve os limites (s) atingidos e ainda não dados;
// só vale se a prova é mais longa que o limite.
export function avisosPendentes(restanteSeg, totalSeg, dados = [], limites = [1800, 600]) {
  return limites.filter((l) => totalSeg > l && restanteSeg <= l && !dados.includes(l));
}
