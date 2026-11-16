import { h, badgesOrigem, frag } from '../dom.js';
import { ctx } from '../ctx.js';
import { contestacaoAtiva, marcar } from '../../logica/marcacoes.js';

export const LETRAS = ['A', 'B', 'C', 'D', 'E'];
export const ROTULO_CONF = { chutei: 'Chutei', duvida: 'Dúvida', certeza: 'Certeza' };
export const curto = (t) => t.curto || t.nome;

// Gabarito, comentário por alternativa (só da marcada e da correta; as outras ficam recolhidas),
// comentário geral, referência e marcação do comentário.
export function cartaoGabarito(q, resp) {
  const com = q.comentario || {};
  const pg = q.pegadinha?.letra; // estimada pela Decisions API no pipeline (pipeline/conferir_gabarito.py)
  const raiz = h('div');
  const botoes = h('div');
  const pintar = () => {
    const contest = contestacaoAtiva(q, ctx.estado);
    const conf = !contest && !!ctx.estado.confirmacoes[q.id];
    const agir = (t) => () => { marcar(ctx.estado, q, t); ctx.salvar(); pintar(); };
    botoes.replaceChildren(frag(
      h('div', { class: 'linha' },
        h('button', { class: 'btn' + (conf ? ' marcado' : ''), onclick: agir(conf ? 'limpar' : 'confirmar') }, conf ? 'Marcado: o comentário me ajudou' : 'O comentário me ajudou'),
        h('button', { class: 'btn' + (contest ? ' perigo marcado' : ''), onclick: agir(contest ? 'limpar' : 'contestar') }, contest ? 'Marcado: acho que está errado' : 'Acho que o comentário está errado')),
      h('p', { class: 'suave' }, contest || conf
        ? 'Toque de novo no botão para desfazer.'
        : 'A sua marca fica guardada neste aparelho e segue no arquivo de "Enviar minhas marcações", em Ajustes. Comentário marcado como errado é refeito na próxima atualização do banco.')));
  };
  pintar();
  const alt = (i) => {
    const L = LETRAS[i];
    const cls = L === q.gabarito ? 'certa' : L === resp ? 'errada' : '';
    return h('div', {},
      h('div', { class: `opcao ${cls}` }, h('span', { class: 'letra' }, L),
        h('span', {}, q.alternativas[i], L === q.gabarito && ' (gabarito)', L === resp && L !== q.gabarito && ' (sua resposta)', L === pg && ' (pegadinha)')),
      com.alternativas?.[i] && h('div', { class: 'comentario' }, com.alternativas[i]));
  };
  const principais = [resp, q.gabarito].filter((L, k, a) => L && a.indexOf(L) === k).map((L) => LETRAS.indexOf(L));
  const outras = LETRAS.map((_, i) => i).filter((i) => !principais.includes(i));
  raiz.append(frag(
    h('div', { class: 'opcoes' }, principais.map(alt)),
    h('details', {}, h('summary', {}, 'Ver as outras alternativas'), h('div', { class: 'opcoes' }, outras.map(alt))),
    pg && h('p', { class: 'badge prov' }, resp === pg
      ? `Você caiu na pegadinha: a alternativa ${pg} é a errada que mais parece certa. Leia o comentário dela acima.`
      : `Pegadinha desta questão: a alternativa ${pg} é a errada que mais parece certa.`),
    h('h2', {}, 'Comentário'),
    com.geral ? h('div', { class: 'comentario' }, com.geral) : h('p', { class: 'suave' }, 'Esta questão ainda não tem comentário.'),
    com.referencia && h('p', { class: 'suave' }, `Referência: ${com.referencia}`),
    com.status === 'nao_revisado' && h('p', { class: 'suave' }, 'Comentário ainda não revisado.'),
    q.gabarito_status === 'provisorio' && h('p', { class: 'badge prov' }, 'Gabarito provisório: pode mudar quando a banca publicar o definitivo.'),
    botoes));
  return raiz;
}

export { badgesOrigem };
