import { h, fmtMin, origemTexto } from '../dom.js';
import { ctx } from '../ctx.js';
import { ritmo } from '../../logica/ritmo.js';
import { SEG_PADRAO } from '../../logica/revisao.js';
import { cartaoGabarito, ROTULO_CONF } from './comum.js';

const tema = (q) => `${q.enunciado.replace(/\s+/g, ' ').slice(0, 80)}${q.enunciado.length > 80 ? "…" : ""} (${q.topicos.map((t) => ctx.topicos.find((x) => x.id === t)?.nome ?? t).join(', ')})`;

export function resultado({ arg }) {
  const r = ctx.estado.historico.find((x) => String(x.id) === arg);
  if (!r) return h('div', { class: 'card' }, h('p', {}, 'Resultado não encontrado.'), h('a', { class: 'btn', href: '#/' }, 'Voltar ao início'));
  const respondidas = r.itens.filter((i) => i.resp);
  const acertos = r.itens.filter((i) => i.certo).length;
  const ref = r.refSeg || SEG_PADRAO;
  const rit = ritmo(respondidas.map((i) => i.seg), ref);

  return h('div', {},
    h('h1', {}, r.titulo),
    h('div', { class: 'card pontos' },
      h('div', { class: 'grande' }, `${acertos} de ${r.itens.length}`),
      h('p', {}, `${Math.round((acertos / r.itens.length) * 100)}% de acertos` + (respondidas.length < r.itens.length ? `, ${r.itens.length - respondidas.length} sem resposta` : '')),
      rit && h('p', { class: 'suave' }, `Seu ritmo: ${fmtMin(rit.mediaSeg)} por questão, ${rit.rotulo} (o tempo previsto era ${fmtMin(ref)}). Tempo total: ${fmtMin(r.totalSeg)}.`)),
    h('h2', {}, 'Questões'),
    r.itens.map((it, k) => {
      const q = ctx.porId.get(it.qid);
      if (!q) return null;
      return h('details', { class: 'card' },
        h('summary', {}, h('span', { class: 'res-titulo' }, `${k + 1}. ${tema(q)}`), h('span', { class: it.resp ? (it.certo ? 'badge ok' : 'badge erro') : 'badge' },
          it.resp ? (it.certo ? 'Acertou' : `Errou (gabarito ${q.gabarito})`) : 'Sem resposta'),
        it.conf && h('span', { class: 'badge' }, ROTULO_CONF[it.conf])),
        h('p', { class: 'suave' }, origemTexto(q)),
        h('p', { class: 'enunciado' }, q.enunciado),
        cartaoGabarito(q, it.resp));
    }),
    h('a', { class: 'btn prim', href: '#/' }, 'Voltar ao início'),
    h('a', { class: 'btn', href: '#/mini' }, 'Fazer outro mini-simulado'));
}
