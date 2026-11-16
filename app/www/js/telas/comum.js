import { h, badgesOrigem } from '../dom.js';
import { ctx } from '../ctx.js';
import { contestacaoAtiva, marcar } from '../../logica/marcacoes.js';

export const LETRAS = ['A', 'B', 'C', 'D', 'E'];
export const ROTULO_CONF = { chutei: 'Chutei', duvida: 'Dúvida', certeza: 'Certeza' };

// Gabarito, comentário geral, comentário por alternativa (quando existe), referência e confirmar/contestar.
export function cartaoGabarito(q, resp) {
  const com = q.comentario || {};
  const raiz = h('div');
  const botoes = h('div', { class: 'linha' });
  const pintar = () => {
    const contest = contestacaoAtiva(q, ctx.estado);
    const conf = !contest && !!ctx.estado.confirmacoes[q.id];
    const agir = (t) => () => { marcar(ctx.estado, q, t); ctx.salvar(); pintar(); };
    botoes.replaceChildren(
      h('button', { class: 'btn' + (conf ? ' prim' : ''), onclick: agir(conf ? 'limpar' : 'confirmar') }, conf ? 'Comentário confirmado' : 'Confirmar comentário'),
      h('button', { class: 'btn' + (contest ? ' perigo' : ''), onclick: agir(contest ? 'limpar' : 'contestar') }, contest ? 'Contestado (toque para desfazer)' : 'Contestar comentário'));
  };
  pintar();
  raiz.append(
    h('div', { class: 'opcoes' }, q.alternativas.map((a, i) => {
      const L = LETRAS[i];
      const cls = L === q.gabarito ? 'certa' : L === resp ? 'errada' : '';
      return h('div', {},
        h('div', { class: `opcao ${cls}` }, h('span', { class: 'letra' }, L),
          h('span', {}, a, L === q.gabarito && ' (gabarito)', L === resp && L !== q.gabarito && ' (sua resposta)')),
        com.alternativas?.[i] && h('div', { class: 'comentario' }, com.alternativas[i]));
    })),
    h('h2', {}, 'Comentário'),
    com.geral ? h('div', { class: 'comentario' }, com.geral) : h('p', { class: 'suave' }, 'Esta questão ainda não tem comentário.'),
    com.referencia && h('p', { class: 'suave' }, `Referência: ${com.referencia}`),
    com.status === 'nao_revisado' && h('p', { class: 'suave' }, 'Comentário ainda não revisado.'),
    q.gabarito_status === 'provisorio' && h('p', { class: 'badge prov' }, 'Gabarito provisório: pode mudar quando a banca publicar o definitivo.'),
    botoes);
  return raiz;
}

export { badgesOrigem };
