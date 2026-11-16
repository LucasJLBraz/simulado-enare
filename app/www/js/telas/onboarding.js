import { h, frag } from '../dom.js';
import { ctx } from '../ctx.js';

const PASSOS = [
  ['Bem-vinda', 'Este app ajuda você a estudar para a prova de Residência em Psicologia do ENARE. Você resolve questões de provas reais, vê onde erra e descobre o que estudar primeiro. Tudo fica no seu celular e funciona sem internet.'],
  ['Diga o quanto confia', 'Antes de ver o gabarito, marque como se sentiu: chutei, dúvida ou certeza. Errar com certeza é o sinal mais importante, porque mostra um engano que você não percebia.'],
  ['Caderno de erros', 'Questões que você erra, ou acerta sem confiança, voltam para revisão. A Revisão do dia mostra o que vence hoje. Quando você acerta com certeza, a questão sai do caderno.'],
  ['Quando é a sua prova?', 'Com a data, as revisões ficam mais espaçadas quando a prova está longe e mais próximas quando ela se aproxima. Você pode pular e informar depois em Ajustes.'],
];

export function onboarding() {
  let i = 0;
  const raiz = h('div');
  const fim = () => { ctx.estado.config.onboardingVisto = true; ctx.salvar(); ctx.ir('#/'); };
  const desenhar = () => {
    const [titulo, texto] = PASSOS[i];
    const ultimo = i === PASSOS.length - 1;
    raiz.replaceChildren(frag(
      h('div', { class: 'dots' }, PASSOS.map((_, k) => h('i', { class: k === i ? 'on' : '' }))),
      h('h1', {}, titulo), h('p', {}, texto),
      ultimo && h('input', { type: 'date', id: 'data-prova', 'aria-label': 'Data da prova', value: ctx.estado.config.dataProva || '',
        onchange: (e) => { ctx.estado.config.dataProva = e.target.value || null; ctx.salvar(); } }),
      h('button', { class: 'btn prim', onclick: () => (ultimo ? fim() : (i++, desenhar())) }, ultimo ? 'Começar' : 'Próxima'),
      i > 0 && h('button', { class: 'btn', onclick: () => { i--; desenhar(); } }, 'Voltar'),
      !ultimo && h('button', { class: 'btn', onclick: fim }, 'Pular')));
  };
  desenhar();
  return raiz;
}
