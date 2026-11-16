import { h, fmtMin, frag } from '../dom.js';
import { ctx } from '../ctx.js';
import { diagnostico, motivo, ROTULO_ESTADO } from '../../logica/dominio.js';
import { ritmoPorTopico } from '../../logica/ritmo.js';
import { SEG_PADRAO, hojeISO } from '../../logica/revisao.js';
import { antesDepois } from '../../logica/progresso.js';
import { curto, blocoAntesDepois } from './comum.js';

export function estudar() {
  const e = ctx.estado;
  const ref = SEG_PADRAO;
  const rit = ritmoPorTopico(ctx.questoes, e.progresso, ref);
  const diag = diagnostico(ctx.questoes, ctx.topicos, e.progresso);
  const diagAp = diagnostico(ctx.questoes, ctx.topicos, e.progresso, { apostila: true }).filter((t) => t.n > 0);
  const ad = antesDepois(ctx.questoes, e.progresso, hojeISO());
  const dominados = ctx.topicos.length - diag.length;
  const cls = { domina: 'badge ok', quase_la: 'badge', base_fraca: 'badge erro', sem_dados: 'badge' };
  let todos = false;

  const cartao = (t, comMotivo) => h('div', { class: 'card' },
    h('h2', {}, curto(t)),
    h('details', {}, h('summary', { class: 'link-sum' }, 'Ver nome no edital'), h('p', { class: 'suave' }, t.nome)),
    h('span', { class: cls[t.estado] }, ROTULO_ESTADO[t.estado]), // só com 5 ou mais respostas; antes disso "Ainda sem dados"
    h('p', {}, comMotivo ? `Por quê: ${motivo(t)}.` : `${t.n} respostas, ${Math.round((t.erro ?? 0) * 100)}% de erro.`),
    comMotivo && blocoAntesDepois(ad[t.id]),
    rit[t.id] && h('p', { class: 'suave' }, `Ritmo: ${fmtMin(rit[t.id].mediaSeg)} por questão, ${rit[t.id].rotulo}.`),
    comMotivo && h('a', { class: 'btn', href: `#/mini?topico=${t.id}` }, 'Treinar este tópico'));

  const lista = h('div');
  const pintar = () => lista.replaceChildren(frag(
    (todos ? diag : diag.slice(0, 5)).map((t) => cartao(t, true)),
    !todos && diag.length > 5 && h('button', { class: 'btn', onclick: () => { todos = true; pintar(); } }, `Ver todos os ${diag.length} tópicos`)));
  pintar();

  return h('div', {},
    h('h1', {}, 'O que estudar'),
    h('p', { class: 'suave' }, 'Tópicos em ordem de prioridade: quanto caem na prova e quanto você ainda erra. A lista usa só questões oficiais.'),
    lista,
    dominados > 0 && h('p', { class: 'suave' }, `${dominados} ${dominados === 1 ? 'tópico' : 'tópicos'} que você já domina ficam fora da lista.`),
    ctx.topicos.some((t) => t.provisorio) && h('p', { class: 'suave' }, 'Os tópicos ainda são provisórios, até o edital ser incluído.'),
    diagAp.length > 0 && [
      h('h2', {}, 'Apostilas (diagnóstico separado)'),
      h('p', { class: 'suave' }, 'Questões de apostila não entram na prioridade acima.'),
      diagAp.map((t) => cartao(t, false))]);
}
