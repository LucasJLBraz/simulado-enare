import { h, badgesOrigem, frag } from '../dom.js';
import { ctx } from '../ctx.js';
import { contestacaoAtiva, marcar } from '../../logica/marcacoes.js';
import { revisaoDoDia } from '../../logica/revisao.js';
import { fraseAntesDepois } from '../../logica/progresso.js';

export const LETRAS = ['A', 'B', 'C', 'D', 'E'];
export const ROTULO_CONF = { chutei: 'Chutei', duvida: 'Dúvida', certeza: 'Certeza' };
export const curto = (t) => t.curto || t.nome;

// Questões vencidas hoje (apostila só se estiver ligada) e o progresso que as originou.
export function vencidasHoje(hoje) {
  const e = ctx.estado;
  const prog = Object.fromEntries(Object.entries(e.progresso).filter(([id]) =>
    ctx.porId.has(id) && (e.config.mini.apostila || ctx.porId.get(id).origem.tipo === 'oficial')));
  return { prog, ids: revisaoDoDia(prog, hoje) };
}

// Começar sessão nova com outra pausada pede confirmação.
export function confirmarNova() {
  const s = ctx.estado.sessao;
  return !s || confirm(`Você tem uma sessão em andamento (${s.titulo}). Começar outra descarta essa, e as respostas já dadas continuam salvas. Continuar?`);
}

// Antes e depois do tópico: duas barras ou "poucas questões ainda".
export function blocoAntesDepois(ad) {
  if (!ad || ad.antes == null || ad.depois == null) return h('p', { class: 'suave' }, `Antes e depois: ${fraseAntesDepois(ad)}.`);
  const linha = (r, v) => h('div', { class: 'linha-barra' }, h('span', { class: 'suave' }, r), h('div', { class: 'barra' }, h('div', { style: `width:${v}%` })), h('span', {}, `${v}%`));
  return h('div', {}, linha('Acertava', ad.antes), linha('Acerta agora', ad.depois));
}

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
      h('div', { class: 'linha iguais' },
        h('button', { class: 'btn' + (conf ? ' marcado' : ''), onclick: agir(conf ? 'limpar' : 'confirmar') }, conf ? 'Marcado: o comentário me ajudou' : 'O comentário me ajudou'),
        h('button', { class: 'btn' + (contest ? ' perigo marcado' : ''), onclick: agir(contest ? 'limpar' : 'contestar') }, contest ? 'Marcado: acho que está errado' : 'Acho que o comentário está errado')),
      (contest || conf) && h('p', { class: 'suave' }, (contest ? 'Marcado. O comentário será refeito na próxima atualização do banco.' : 'Marca guardada.') + ' Toque de novo para desfazer.')));
  };
  pintar();
  const alt = (i) => {
    const L = LETRAS[i];
    const cls = L === q.gabarito ? 'certa' : L === resp ? 'errada' : '';
    return h('div', {},
      h('div', { class: `opcao ${cls}` }, h('span', { class: 'letra' }, L),
        h('span', {}, q.alternativas[i], h('div', {},
          L === q.gabarito && h('span', { class: 'badge ok' }, 'Gabarito'), L === resp && L !== q.gabarito && h('span', { class: 'badge erro' }, 'Sua resposta'),
          L === pg && h('span', { class: 'badge prov' }, 'Pegadinha')))),
      com.alternativas?.[i] && h('div', { class: 'comentario' }, com.alternativas[i]));
  };
  const principais = [resp, q.gabarito].filter((L, k, a) => L && a.indexOf(L) === k).map((L) => LETRAS.indexOf(L));
  const outras = LETRAS.map((_, i) => i).filter((i) => !principais.includes(i));
  raiz.append(frag(
    h('div', { class: 'opcoes' }, principais.map(alt)),
    h('details', {}, h('summary', { class: 'link-sum' }, 'Ver as outras alternativas'), h('div', { class: 'opcoes' }, outras.map(alt))),
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
