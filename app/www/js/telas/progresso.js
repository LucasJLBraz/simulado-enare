import { h } from '../dom.js';
import { ctx } from '../ctx.js';
import { hojeISO } from '../../logica/revisao.js';
import { antesDepois, errosCorrigidos, fraseCorrigidos, fraseAntesDepois } from '../../logica/progresso.js';
import { curto, blocoAntesDepois } from './comum.js';

const dataBR = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function progresso() {
  const e = ctx.estado;
  const ad = antesDepois(ctx.questoes, e.progresso, hojeISO());
  // Quem tem comparação primeiro (o que mais subiu no topo), depois os que ainda têm poucas questões.
  const comparavel = (t) => ad[t.id].antes != null && ad[t.id].depois != null;
  const topicos = ctx.topicos.filter((t) => ad[t.id]).sort((a, b) =>
    (comparavel(b) - comparavel(a)) || (comparavel(a) ? (ad[b.id].depois - ad[b.id].antes) - (ad[a.id].depois - ad[a.id].antes) : ad[b.id].n - ad[a.id].n));
  const sessoes = [...e.historico].reverse();

  return h('div', {},
    h('h1', {}, 'Progresso'),
    h('div', { class: 'card' }, h('h2', {}, 'Erros com certeza'), h('p', {}, fraseCorrigidos(errosCorrigidos(e.progresso)))),
    h('h2', {}, 'Suas sessões'),
    sessoes.length
      ? sessoes.map((r) => {
        const acertos = r.itens.filter((i) => i.certo).length;
        return h('a', { class: 'card item-sessao', href: `#/resultado/${r.id}` },
          h('strong', {}, r.titulo), h('span', { class: 'suave' }, `${dataBR(r.quando)}. Acertou ${acertos} de ${r.itens.length}.`));
      })
      : h('p', { class: 'suave' }, 'Nenhuma sessão terminada ainda. Os resultados ficam aqui.'),
    h('h2', {}, 'Antes e depois por tópico'),
    h('p', { class: 'suave' }, 'Domínio nas últimas 2 semanas contra o que veio antes, só com questões oficiais. Com menos de 5 respostas numa das partes não há porcentagem.'),
    topicos.length
      ? topicos.map((t) => h('div', { class: 'card' }, h('h2', {}, curto(t)),
        comparavel(t) ? blocoAntesDepois(ad[t.id]) : h('p', { class: 'suave' }, fraseAntesDepois(ad[t.id]))))
      : h('p', { class: 'suave' }, 'Responda questões oficiais para ver a evolução por tópico.'));
}
