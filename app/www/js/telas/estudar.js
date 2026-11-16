import { h, fmtMin } from '../dom.js';
import { ctx } from '../ctx.js';
import { diagnostico, motivo, ROTULO_ESTADO } from '../../logica/dominio.js';
import { ritmoPorTopico, refSegPorQuestao } from '../../logica/ritmo.js';

export function estudar() {
  const e = ctx.estado;
  const ref = refSegPorQuestao(ctx.meta.formato_prova);
  const rit = ritmoPorTopico(ctx.questoes, e.progresso, ref);
  const diag = diagnostico(ctx.questoes, ctx.topicos, e.progresso);
  const diagAp = diagnostico(ctx.questoes, ctx.topicos, e.progresso, { apostila: true }).filter((t) => t.n > 0);
  const dominados = ctx.topicos.length - diag.length;
  const cls = { domina: 'badge ok', quase_la: 'badge', base_fraca: 'badge erro' };

  const cartao = (t, comMotivo) => h('div', { class: 'card' },
    h('h2', {}, t.nome),
    h('span', { class: cls[t.estado] }, ROTULO_ESTADO[t.estado]),
    h('p', {}, comMotivo ? `Por quê: ${motivo(t)}.` : `${t.n} respostas, ${Math.round((t.erro ?? 0) * 100)}% de erro.`),
    rit[t.id] && h('p', { class: 'suave' }, `Ritmo: ${fmtMin(rit[t.id].mediaSeg)} por questão, ${rit[t.id].rotulo}.`),
    comMotivo && h('a', { class: 'btn', href: `#/mini?topico=${t.id}` }, 'Treinar este tópico'));

  return h('div', {},
    h('h1', {}, 'O que estudar'),
    h('p', { class: 'suave' }, 'Tópicos em ordem de prioridade: quanto caem na prova e quanto você ainda erra. A lista usa só questões oficiais.'),
    diag.map((t) => cartao(t, true)),
    dominados > 0 && h('p', { class: 'suave' }, `${dominados} ${dominados === 1 ? 'tópico' : 'tópicos'} que você já domina ficam fora da lista.`),
    ctx.topicos.some((t) => t.provisorio) && h('p', { class: 'suave' }, 'Os tópicos ainda são provisórios, até o edital ser incluído.'),
    diagAp.length > 0 && [
      h('h2', {}, 'Apostilas (diagnóstico separado)'),
      h('p', { class: 'suave' }, 'Questões de apostila não entram na prioridade acima.'),
      diagAp.map((t) => cartao(t, false))]);
}
