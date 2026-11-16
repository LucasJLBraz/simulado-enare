import { h, fmtSeg, badgesOrigem } from '../dom.js';
import { ctx } from '../ctx.js';
import { avisosPendentes } from '../../logica/simulado.js';
import { atualId, decorrido, restante, marcarQuestaoExibida, registrarResposta, finalizar, pausar, retomar, pular } from '../sessao.js';
import { cartaoGabarito, LETRAS, ROTULO_CONF } from './comum.js';

export function questao() {
  const s = ctx.estado.sessao;
  if (!s) { setTimeout(() => ctx.ir('#/'), 0); return h('div'); }
  if (!s.rodandoDesde) retomar(s);

  const raiz = h('div');
  const relogio = h('span', { class: 'relogio' });
  const porQ = h('span', { class: 'relogio suave' });
  let resp = null, conf = null, feedback = false, ultimo = null;

  const terminar = () => { const id = finalizar(s); ctx.ir(`#/resultado/${id}`); };

  const avisar = (texto) => {
    const el = document.getElementById('aviso');
    el.textContent = texto; el.hidden = false;
    try { navigator.vibrate?.([300, 150, 300]); } catch { /* sem vibração */ }
    setTimeout(() => { el.hidden = true; }, 8000);
  };

  const tick = () => {
    const rest = restante(s);
    if (rest != null) {
      relogio.textContent = `Restam ${fmtSeg(rest)}`;
      relogio.className = 'relogio' + (rest <= 600 ? ' fim' : '');
      for (const l of avisosPendentes(rest, s.totalSeg, s.avisos)) {
        s.avisos.push(l); ctx.salvar();
        avisar(`Faltam ${l / 60} minutos`);
      }
      if (rest <= 0) { terminar(); return; }
    } else relogio.textContent = `Tempo ${fmtSeg(decorrido(s))}`;
    porQ.textContent = ` · nesta questão ${fmtSeg(decorrido(s) - s.qInicio)} de ${fmtSeg(s.porQuestaoSeg)}`;
    s.tickEm = Date.now();
  };
  const id1 = setInterval(tick, 1000);
  const id2 = setInterval(() => ctx.salvar(), 5000);
  ctx.limpeza = () => {
    clearInterval(id1); clearInterval(id2);
    if (ctx.estado.sessao) { ctx.estado.sessao.tickEm = Date.now(); ctx.salvar(); }
  };
  const onHide = () => { if (document.hidden && ctx.estado.sessao) { ctx.estado.sessao.tickEm = Date.now(); ctx.salvar(); } };
  document.addEventListener('visibilitychange', onHide);
  const limpezaBase = ctx.limpeza;
  ctx.limpeza = () => { limpezaBase(); document.removeEventListener('visibilitychange', onHide); document.getElementById('aviso').hidden = true; };

  const proxima = () => { resp = conf = null; feedback = false; mostrar(); window.scrollTo(0, 0); };

  const mostrar = () => {
    const id = feedback ? ultimo : atualId(s);
    if (!id) { terminar(); return; }
    const q = ctx.porId.get(id);
    marcarQuestaoExibida(s, id);
    const feitas = Object.keys(s.respostas).length;
    const pronta = resp && conf;

    const topo = h('div', { class: 'topo-questao' },
      h('div', { class: 'linha' }, h('strong', {}, `Questão ${Math.min(feitas + (feedback ? 0 : 1), s.fila.length)} de ${s.fila.length}`), h('span', {}, relogio, porQ)),
      h('div', { class: 'barra' }, h('div', { style: `width:${(feitas / s.fila.length) * 100}%` })));

    const corpo = [topo, badgesOrigem(q), h('p', { class: 'enunciado' }, q.enunciado)];

    if (!feedback) {
      corpo.push(
        h('div', { class: 'opcoes' }, q.alternativas.map((a, i) => h('button', { class: 'opcao' + (resp === LETRAS[i] ? ' sel' : ''),
          'aria-pressed': resp === LETRAS[i], onclick: () => { resp = LETRAS[i]; mostrar(); } },
          h('span', { class: 'letra' }, LETRAS[i]), h('span', {}, a)))),
        h('h2', {}, 'Quanto você confia nesta resposta?'),
        h('div', { class: 'escolha' }, Object.entries(ROTULO_CONF).map(([v, r]) =>
          h('button', { class: conf === v ? 'sel' : '', 'aria-pressed': conf === v, onclick: () => { conf = v; mostrar(); } }, r))),
        h('button', { class: 'btn prim', disabled: !pronta, onclick: () => {
          registrarResposta(s, q, resp, conf); ultimo = q.id;
          if (s.feedback === 'cada') { feedback = true; mostrar(); window.scrollTo(0, 0); } else proxima();
        } }, pronta ? 'Confirmar resposta' : 'Marque a resposta e a confiança'),
        h('div', { class: 'linha' },
          h('button', { class: 'btn', onclick: () => { pular(s, id); proxima(); } }, 'Pular'),
          s.modo === 'treino' && h('button', { class: 'btn', onclick: () => { pausar(s); ctx.ir('#/'); } }, 'Pausar'),
          h('button', { class: 'btn perigo', onclick: () => { if (confirm('Encerrar agora? As questões não respondidas ficam em branco.')) terminar(); } }, 'Encerrar')));
    } else {
      const r = s.respostas[id];
      corpo.push(
        h('p', { class: r.certo ? 'badge ok' : 'badge erro' }, r.certo ? 'Você acertou' : `Você errou. Gabarito: ${q.gabarito}`),
        cartaoGabarito(q, r.resp),
        h('button', { class: 'btn prim', onclick: proxima }, atualId(s) ? 'Próxima questão' : 'Ver resultado'));
    }
    raiz.replaceChildren(...corpo);
    tick();
  };
  mostrar();
  return raiz;
}
