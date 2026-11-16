import { ctx } from './ctx.js';
import { carregar } from './estado.js';
import { h } from './dom.js';
import { limparContestacoesAntigas } from '../logica/marcacoes.js';
import { normalizarSessao } from './sessao.js';
import { onboarding } from './telas/onboarding.js';
import { inicio } from './telas/inicio.js';
import { miniSetup } from './telas/mini.js';
import { simuladoSetup } from './telas/simulado.js';
import { questao } from './telas/questao.js';
import { resultado } from './telas/resultado.js';
import { estudar } from './telas/estudar.js';
import { ajustes } from './telas/ajustes.js';

const telas = { '': inicio, onboarding, mini: miniSetup, simulado: simuladoSetup, questao, resultado, estudar, ajustes };
const comNav = new Set(['', 'estudar', 'ajustes']);
const nav = [['#/', 'Início', ''], ['#/estudar', 'O que estudar', 'estudar'], ['#/ajustes', 'Ajustes', 'ajustes']];

function rota() {
  const [caminho, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [nome, arg] = caminho.split('/');
  return { nome, arg, params: Object.fromEntries(new URLSearchParams(query)) };
}

function desenhar() {
  if (ctx.limpeza) { ctx.limpeza(); ctx.limpeza = null; }
  const { nome, arg, params } = rota();
  const app = document.getElementById('app');
  const tela = telas[nome] || inicio;
  app.replaceChildren(tela({ arg, params }));
  window.scrollTo(0, 0);
  const n = document.getElementById('nav');
  n.hidden = !comNav.has(nome);
  n.replaceChildren(...nav.map(([href, rot, id]) => h('a', { href, class: id === nome ? 'ativo' : '' }, rot)));
}

async function boot() {
  const app = document.getElementById('app');
  try {
    const [questoes, topicos, meta] = await Promise.all(['questoes', 'topicos', 'meta'].map((n) =>
      fetch(`banco/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); })));
    Object.assign(ctx, { questoes, topicos, meta, porId: new Map(questoes.map((q) => [q.id, q])) });
  } catch {
    app.replaceChildren(h('div', { class: 'card' }, h('h1', {}, 'Banco de questões não encontrado'),
      h('p', {}, 'Rode "npm run banco" na pasta app e abra o app de novo.')));
    return;
  }
  ctx.estado = carregar();
  limparContestacoesAntigas(ctx.estado, ctx.questoes);
  normalizarSessao(ctx.estado.sessao);
  ctx.salvar();
  window.addEventListener('hashchange', desenhar);
  if (!ctx.estado.config.onboardingVisto && !location.hash) location.hash = '#/onboarding';
  else desenhar();
}
boot();
