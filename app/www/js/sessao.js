// Ciclo de vida de uma sessão (mini-simulado, simulado ou revisão do dia). Sem DOM.
import { ctx } from './ctx.js';
import { atualizarCaderno, destinoCaderno, hojeISO, diasEntre } from '../logica/revisao.js';

export const decorrido = (s, agora = Date.now()) => s.acumuladoSeg + (s.rodandoDesde ? (agora - s.rodandoDesde) / 1000 : 0);
export const atualId = (s) => s.fila.find((id) => !s.respostas[id]);
export const restante = (s) => (s.totalSeg == null ? null : s.totalSeg - decorrido(s));

export function iniciar({ tipo, titulo, fila, modo = null, feedback = 'fim', totalSeg = null, porQuestaoSeg = 180 }) {
  ctx.estado.sessao = { tipo, titulo, fila, modo, feedback, totalSeg, porQuestaoSeg, respostas: {}, acumuladoSeg: 0,
    rodandoDesde: Date.now(), tickEm: Date.now(), qId: null, qInicio: 0, avisos: [] };
  ctx.salvar();
}

export function pausar(s) { s.acumuladoSeg = decorrido(s); s.rodandoDesde = null; ctx.salvar(); }
// Modo prova segue o relógio de parede: nunca re-arma. Só retoma sessão realmente pausada.
export function retomar(s) {
  if (s.modo === 'prova' || s.rodandoDesde) return;
  s.rodandoDesde = Date.now(); s.tickEm = Date.now(); ctx.salvar();
}
export function pular(s, id) { s.fila = s.fila.filter((x) => x !== id).concat(id); ctx.salvar(); }

// Ao abrir o app: sessão em modo prova segue o relógio de parede; as demais ficam pausadas
// no último instante salvo.
export function normalizarSessao(s) {
  if (!s || !s.rodandoDesde || s.modo === 'prova') return;
  s.acumuladoSeg += Math.max(0, (s.tickEm - s.rodandoDesde) / 1000);
  s.rodandoDesde = null;
}

export function marcarQuestaoExibida(s, id) {
  if (s.qId !== id) { s.qId = id; s.qInicio = decorrido(s); }
}

export function registrarResposta(s, q, resp, conf) {
  const seg = Math.max(1, Math.round(decorrido(s) - s.qInicio));
  const certo = resp === q.gabarito;
  s.respostas[q.id] = { resp, conf, seg, certo };
  const e = ctx.estado;
  const p = (e.progresso[q.id] ||= { respostas: [] });
  const hoje = hojeISO();
  p.respostas.push({ quando: hoje, resp, certo, conf, seg });
  const dias = e.config.dataProva ? diasEntre(hoje, e.config.dataProva) : null;
  const destino = destinoCaderno(p.caderno, { certo, conf }, hoje, dias);
  const novo = atualizarCaderno(p.caderno, { certo, conf }, hoje, dias);
  if (novo) p.caderno = novo; else delete p.caderno;
  ctx.salvar();
  return destino;
}

export function finalizar(s) {
  const e = ctx.estado;
  const id = Date.now();
  e.historico.push({
    id, quando: hojeISO(), tipo: s.tipo, titulo: s.titulo, modo: s.modo, feedback: s.feedback, totalSeg: Math.round(decorrido(s)),
    refSeg: s.totalSeg != null ? s.totalSeg / s.fila.length : s.porQuestaoSeg,
    itens: s.fila.map((qid) => ({ qid, ...(s.respostas[qid] || { resp: null }) })),
  });
  e.historico = e.historico.slice(-30);
  e.sessao = null;
  ctx.salvar();
  return id;
}
