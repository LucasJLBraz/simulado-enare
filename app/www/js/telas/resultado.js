import { h, fmtMin, origemTexto, figura, frag } from '../dom.js';
import { ctx } from '../ctx.js';
import { ritmo } from '../../logica/ritmo.js';
import { SEG_PADRAO, metaHoje, fraseAmanha, hojeISO } from '../../logica/revisao.js';
import { resumoPorTopico } from '../../logica/progresso.js';
import { cartaoGabarito, ROTULO_CONF, curto, vencidasHoje } from './comum.js';

const nomeTopico = (id) => curto(ctx.topicos.find((x) => x.id === id) ?? { nome: id });
const tema = (q) => `${q.enunciado.replace(/\s+/g, ' ').slice(0, 80)}${q.enunciado.length > 80 ? "…" : ""} (${q.topicos.map(nomeTopico).join(', ')})`;

export function resultado({ arg }) {
  const r = ctx.estado.historico.find((x) => String(x.id) === arg);
  if (!r) return h('div', { class: 'card' }, h('p', {}, 'Resultado não encontrado.'), h('a', { class: 'btn', href: '#/' }, 'Voltar ao início'));
  const respondidas = r.itens.filter((i) => i.resp);
  const acertos = r.itens.filter((i) => i.certo).length;
  const ref = r.refSeg || SEG_PADRAO;
  const rit = ritmo(respondidas.map((i) => i.seg), ref);
  const hoje = hojeISO();
  // Só a prova terminada mostra o gabarito das não respondidas sem pedir.
  const escondeGabarito = r.tipo !== 'simulado';

  // Revisão do dia completa e de hoje: meta e o que muda amanhã.
  const revisaoFeita = r.tipo === 'revisao' && r.quando === hoje && respondidas.length === r.itens.length;
  const meta = revisaoFeita && metaHoje(ctx.estado.revisaoHoje, vencidasHoje(hoje).ids.length, hoje);

  const topicos = resumoPorTopico(r.itens, ctx.porId).filter((t) => t.acertos < t.n);
  const linhaTopico = (t) => h('p', {}, `${nomeTopico(t.id)}: acertou ${t.acertos} de ${t.n}.`);

  let soErradas = false;
  const lista = h('div');
  const pintarLista = () => lista.replaceChildren(frag(r.itens.map((it, k) => {
    const q = ctx.porId.get(it.qid);
    if (!q || (soErradas && !(it.resp && !it.certo))) return null;
    const gab = h('div');
    const mostrarGabarito = () => gab.replaceChildren(cartaoGabarito(q, it.resp));
    if (it.resp || !escondeGabarito) mostrarGabarito();
    else gab.append(h('button', { class: 'btn', onclick: mostrarGabarito }, 'Ver gabarito'));
    return h('details', { class: 'card' },
      h('summary', {}, h('span', { class: 'res-titulo' }, `${k + 1}. ${tema(q)}`), h('span', { class: it.resp ? (it.certo ? 'badge ok' : 'badge erro') : 'badge' },
        it.resp ? (it.certo ? 'Acertou' : `Errou (gabarito ${q.gabarito})`) : 'Sem resposta'),
      it.conf && h('span', { class: 'badge' }, ROTULO_CONF[it.conf])),
      h('p', { class: 'suave' }, origemTexto(q)),
      h('p', { class: 'enunciado' }, q.enunciado), figura(q), gab);
  })));
  pintarLista();

  const filtro = h('div', { class: 'escolha' });
  const pintarFiltro = () => filtro.replaceChildren(frag([[false, 'Todas'], [true, 'Só as erradas']].map(([v, rot]) =>
    h('button', { class: soErradas === v ? 'sel' : '', 'aria-pressed': soErradas === v, onclick: () => { soErradas = v; pintarFiltro(); pintarLista(); } }, rot))));
  pintarFiltro();

  return h('div', {},
    h('h1', {}, r.titulo),
    revisaoFeita && h('div', { class: 'card destaque' },
      h('h2', {}, meta.feitas < meta.total ? 'Revisão terminada' : 'Revisão do dia feita'),
      h('p', {}, meta.feitas < meta.total ? `Faltam ${meta.total - meta.feitas} para hoje.` : `Hoje você revisou ${meta.feitas} de ${meta.total}.`),
      fraseAmanha(ctx.estado.progresso, r.itens.map((i) => i.qid), hoje).map((f) => h('p', {}, f))),
    h('div', { class: 'card pontos' },
      h('div', { class: 'grande' }, `${acertos} de ${r.itens.length}`),
      h('p', {}, `${Math.round((acertos / r.itens.length) * 100)}% de acertos` + (respondidas.length < r.itens.length ? `, ${r.itens.length - respondidas.length} sem resposta` : '')),
      rit && h('p', { class: 'suave' }, `Seu ritmo: ${fmtMin(rit.mediaSeg)} por questão, ${rit.rotulo} (o tempo previsto era ${fmtMin(ref)}). Tempo total: ${fmtMin(r.totalSeg)}.`)),
    topicos.length > 0 && [
      h('h2', {}, 'Onde você perdeu pontos'),
      topicos.slice(0, 5).map(linhaTopico),
      topicos.length > 5 && h('details', {}, h('summary', {}, 'Ver todos os tópicos'), topicos.slice(5).map(linhaTopico))],
    h('h2', {}, 'Questões'),
    filtro,
    lista,
    h('a', { class: 'btn prim', href: '#/' }, 'Voltar ao início'),
    h('a', { class: 'btn', href: '#/mini' }, 'Fazer outro mini-simulado'));
}
