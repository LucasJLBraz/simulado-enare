import { h } from '../dom.js';
import { ctx } from '../ctx.js';
import { montar, edicoes, provaReal, MIN_POR_QUESTAO } from '../../logica/simulado.js';
import { iniciar } from '../sessao.js';

export function simuladoSetup() {
  const e = ctx.estado;
  const f = ctx.meta.formato_prova;
  const eds = edicoes(ctx.questoes);
  const vistos = new Set(Object.keys(e.progresso).filter((id) => e.progresso[id].respostas?.length));
  const s = { tipo: eds.length ? 'real' : 'montado', edicao: eds[0]?.edicao, modo: 'prova', porQ: MIN_POR_QUESTAO, total: null };
  const raiz = h('div');

  const lista = () => (s.tipo === 'real' ? provaReal(ctx.questoes, s.edicao) : montar(ctx.questoes, vistos, f).questoes);
  const n = () => (s.tipo === 'real' ? eds.find((x) => x.edicao === s.edicao)?.n ?? 0 : lista().length);

  const desenhar = () => {
    const total = s.total ?? Math.round(n() * s.porQ * 60);
    const ed = eds.find((x) => x.edicao === s.edicao);
    const faltam = s.tipo === 'montado' ? montar(ctx.questoes, vistos, f).faltam : null;
    raiz.replaceChildren(
      h('h1', {}, 'Simulado completo'),
      h('label', { class: 'campo' }, 'Tipo'),
      h('div', { class: 'escolha' },
        h('button', { class: s.tipo === 'real' ? 'sel' : '', onclick: () => { s.tipo = 'real'; s.total = null; desenhar(); } }, 'Prova real'),
        h('button', { class: s.tipo === 'montado' ? 'sel' : '', onclick: () => { s.tipo = 'montado'; s.total = null; desenhar(); } }, 'Montado')),
      s.tipo === 'real'
        ? [h('label', { class: 'campo' }, 'Edição'),
          h('select', { onchange: (ev) => { s.edicao = ev.target.value; s.total = null; desenhar(); } },
            eds.map((x) => h('option', { value: x.edicao, selected: x.edicao === s.edicao }, `ENARE ${x.edicao} (${x.n} questões)`))),
          h('p', { class: 'suave' }, 'Todas as questões não anuladas da edição, na ordem original.')]
        : h('p', { class: 'suave' }, `Sorteio de várias edições do ENARE: ${f.gerais} de conhecimentos gerais e ${f.especificos} específicas. Inéditas primeiro.`),
      s.tipo === 'real' && ed && ed.n < ed.esperadas &&
        h('p', { class: 'badge prov' }, `Esta prova tem ${ed.n} questões no app (algumas foram anuladas ou dependem de figura).`),
      faltam && (faltam.gerais > 0 || faltam.especificos > 0) &&
        h('p', { class: 'badge prov' }, `O banco tem menos questões que a prova: ${n()} no total.`),
      h('label', { class: 'campo' }, 'Modo'),
      h('div', { class: 'escolha' },
        h('button', { class: s.modo === 'prova' ? 'sel' : '', onclick: () => { s.modo = 'prova'; desenhar(); } }, 'Modo prova'),
        h('button', { class: s.modo === 'treino' ? 'sel' : '', onclick: () => { s.modo = 'treino'; desenhar(); } }, 'Modo treino')),
      h('p', { class: 'suave' }, s.modo === 'prova' ? 'Tempo corrido, sem pausa, como no dia.' : 'Você pode pausar e continuar depois.'),
      h('label', { class: 'campo' }, 'Tempo total (minutos)'),
      h('input', { type: 'number', min: 1, value: Math.round(total / 60), onchange: (ev) => { s.total = Math.max(60, Math.round(+ev.target.value * 60)); s.porQ = s.total / 60 / (n() || 1); desenhar(); } }),
      h('label', { class: 'campo' }, 'Tempo por questão (minutos)'),
      h('input', { type: 'number', min: 0.5, step: 0.5, value: +(total / 60 / (n() || 1)).toFixed(1), onchange: (ev) => { s.porQ = Math.max(0.5, +ev.target.value); s.total = Math.round(n() * s.porQ * 60); desenhar(); } }),
      h('button', { class: 'btn prim', disabled: !n(), onclick: () => {
        const qs = lista();
        iniciar({ tipo: 'simulado', titulo: s.tipo === 'real' ? `Prova real ENARE ${s.edicao}` : 'Simulado montado',
          fila: qs.map((q) => q.id), modo: s.modo, feedback: 'fim', totalSeg: total, porQuestaoSeg: Math.round((total / qs.length)) });
        ctx.ir('#/questao');
      } }, 'Começar simulado'),
      h('a', { class: 'btn', href: '#/' }, 'Voltar'));
  };
  desenhar();
  return raiz;
}
