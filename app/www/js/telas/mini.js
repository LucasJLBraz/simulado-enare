import { h } from '../dom.js';
import { ctx } from '../ctx.js';
import { sortear } from '../../logica/sorteio.js';
import { iniciar } from '../sessao.js';

export function miniSetup({ params }) {
  const e = ctx.estado;
  const c = e.config.mini;
  if (params.topico) c.topico = params.topico;
  const vistos = new Set(Object.keys(e.progresso).filter((id) => e.progresso[id].respostas?.length));
  const raiz = h('div');

  const pool = () => ctx.questoes.filter((q) =>
    (c.apostila || q.origem.tipo === 'oficial') && (c.topico === 'misturado' || q.topicos.includes(c.topico)));

  const desenhar = () => {
    const p = pool();
    const ineditas = p.filter((q) => !vistos.has(q.id)).length;
    const n = Math.max(1, Math.min(c.n, p.length || 1));
    raiz.replaceChildren(
      h('h1', {}, 'Mini-simulado'),
      h('label', { class: 'campo' }, 'Quantas questões?'),
      h('div', { class: 'linha stepper' },
        h('button', { class: 'btn', onclick: () => { c.n = Math.max(1, c.n - 1); desenhar(); } }, '−'),
        h('input', { type: 'number', min: 1, max: 100, value: c.n, 'aria-label': 'Número de questões', onchange: (ev) => { c.n = Math.max(1, +ev.target.value || 1); desenhar(); } }),
        h('button', { class: 'btn', onclick: () => { c.n = Math.min(100, c.n + 1); desenhar(); } }, '+')),
      h('label', { class: 'campo' }, 'Tópico'),
      h('select', { onchange: (ev) => { c.topico = ev.target.value; desenhar(); } },
        h('option', { value: 'misturado', selected: c.topico === 'misturado' }, 'Misturado'),
        ctx.topicos.map((t) => h('option', { value: t.id, selected: c.topico === t.id }, t.nome))),
      h('p', { class: 'suave' }, `${p.length} questões disponíveis, ${ineditas} ainda inéditas. Inéditas vêm primeiro.`),
      h('label', { class: 'campo' }, 'Gabarito'),
      h('div', { class: 'escolha' },
        [['cada', 'A cada questão'], ['fim', 'No fim']].map(([v, r]) =>
          h('button', { class: c.feedback === v ? 'sel' : '', onclick: () => { c.feedback = v; desenhar(); } }, r))),
      h('label', { class: 'interruptor campo' }, h('span', {}, 'Usar cronômetro (3 min por questão)'),
        h('input', { type: 'checkbox', checked: c.timer, onchange: (ev) => { c.timer = ev.target.checked; } })),
      h('label', { class: 'interruptor campo' }, h('span', {}, 'Incluir questões de apostila'),
        h('input', { type: 'checkbox', checked: c.apostila, onchange: (ev) => { c.apostila = ev.target.checked; desenhar(); } })),
      c.apostila && h('p', { class: 'suave' }, 'Questões de apostila aparecem sempre com um selo e não são do ENARE.'),
      p.length === 0 && h('p', { class: 'badge erro' }, 'Nenhuma questão para esta escolha.'),
      h('button', { class: 'btn prim', disabled: p.length === 0, onclick: () => {
        ctx.salvar();
        const fila = sortear(p, vistos, n).map((q) => q.id);
        const nome = c.topico === 'misturado' ? 'Misturado' : ctx.topicos.find((t) => t.id === c.topico)?.nome;
        iniciar({ tipo: 'mini', titulo: `Mini-simulado: ${nome}`, fila, feedback: c.feedback, totalSeg: c.timer ? fila.length * 180 : null });
        ctx.ir('#/questao');
      } }, `Começar com ${n} ${n === 1 ? 'questão' : 'questões'}`),
      h('a', { class: 'btn', href: '#/' }, 'Voltar'));
  };
  desenhar();
  return raiz;
}
