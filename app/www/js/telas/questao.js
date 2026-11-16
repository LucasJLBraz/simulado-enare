import { h, fmtSeg, badgesOrigem, frag, figura } from '../dom.js';
import { ctx } from '../ctx.js';
import { avisosPendentes } from '../../logica/simulado.js';
import { mensagemFeedback } from '../../logica/revisao.js';
import { atualId, restante, marcarQuestaoExibida, registrarResposta, finalizar, pausar, retomar, pular } from '../sessao.js';
import { cartaoGabarito, LETRAS, ROTULO_CONF } from './comum.js';

export function questao() {
  const s = ctx.estado.sessao;
  if (!s) { setTimeout(() => ctx.ir('#/'), 0); return h('div'); }
  if (!s.rodandoDesde) retomar(s);

  const raiz = h('div');
  const relogio = h('span', { class: 'relogio' });
  let resp = null, conf = null, feedback = false, ultimo = null, destino = null;

  const terminar = () => { const id = finalizar(s); ctx.ir(`#/resultado/${id}`); };

  // Revisão do dia encerrada no meio volta ao Início sem tela de nota; as que faltam seguem vencidas.
  const encerrar = () => {
    if (s.tipo !== 'revisao') { if (confirm('Encerrar agora? As questões não respondidas ficam em branco.')) terminar(); return; }
    if (!confirm('Encerrar a revisão? As questões que faltam continuam vencidas hoje.')) return;
    if (Object.keys(s.respostas).length) finalizar(s); else { ctx.estado.sessao = null; ctx.salvar(); }
    ctx.ir('#/');
  };

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
      // Avisos de tempo só aparecem com o relógio à vista.
      if (!ctx.estado.config.ocultarRelogio) for (const l of avisosPendentes(rest, s.totalSeg, s.avisos)) {
        s.avisos.push(l); ctx.salvar();
        avisar(`Faltam ${l / 60} minutos`);
      }
      if (rest <= 0) { terminar(); return; }
    }
    s.tickEm = Date.now();
  };
  const id1 = setInterval(tick, 1000);
  const id2 = setInterval(() => ctx.salvar(), 5000);
  ctx.limpeza = () => {
    clearInterval(id1); clearInterval(id2);
    const sessao = ctx.estado.sessao;
    if (sessao && sessao.modo !== 'prova') pausar(sessao); // sair da tela pausa (menos no modo prova)
    else if (sessao) { sessao.tickEm = Date.now(); ctx.salvar(); }
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

    // Relógio só quando há cronômetro (o tempo continua medido sem ele); pode ser escondido em qualquer modo.
    const comRelogio = s.totalSeg != null;
    const oculto = ctx.estado.config.ocultarRelogio;
    const topo = h('div', { class: 'topo-questao' },
      h('div', { class: 'linha cabecalho' },
        h('strong', {}, s.tipo === 'simulado' ? `Respondidas ${feitas} de ${s.fila.length}`
          : `Questão ${Math.min(feitas + (feedback ? 0 : 1), s.fila.length)} de ${s.fila.length}`),
        h('div', { class: 'barra' }, h('div', { style: `width:${(feitas / s.fila.length) * 100}%` })),
        comRelogio && !oculto && relogio,
        comRelogio && h('button', { class: 'btn pequeno discreto', 'aria-label': oculto ? 'Mostrar o relógio' : 'Esconder o relógio',
          onclick: () => { ctx.estado.config.ocultarRelogio = !oculto; ctx.salvar(); mostrar(); } }, oculto ? 'Mostrar relógio' : 'Esconder')),
      feedback && h('div', { class: 'faixa ' + (s.respostas[id].certo ? 'ok' : 'erro') },
        h('strong', {}, mensagemFeedback(s.respostas[id], destino)),
        !s.respostas[id].certo && h('div', {}, `Gabarito: ${q.gabarito}.`)));

    const corpo = [topo, badgesOrigem(q), h('p', { class: 'enunciado' }, q.enunciado), figura(q)];

    if (!feedback) {
      const falta = !resp && !conf ? 'a alternativa e a confiança' : !resp ? 'a alternativa' : 'a confiança';
      corpo.push(
        h('div', { class: 'opcoes' }, q.alternativas.map((a, i) => h('button', { class: 'opcao' + (resp === LETRAS[i] ? ' sel' : ''),
          'aria-pressed': resp === LETRAS[i], onclick: () => { resp = LETRAS[i]; mostrar(); } },
          h('span', { class: 'letra' }, LETRAS[i]), h('span', {}, a)))),
        h('div', { class: 'linha' },
          h('button', { class: 'btn', onclick: () => { pular(s, id); proxima(); } }, 'Pular (volta no fim)'),
          s.modo !== 'prova' && h('button', { class: 'btn', onclick: () => { pausar(s); ctx.ir('#/'); } }, 'Pausar'),
          h('button', { class: 'btn perigo', onclick: encerrar }, 'Encerrar')),
        h('div', { class: 'rodape' },
          h('div', { class: 'escolha' }, Object.entries(ROTULO_CONF).map(([v, r]) =>
            h('button', { class: conf === v ? 'sel' : '', 'aria-pressed': conf === v, onclick: () => { conf = v; mostrar(); } }, r))),
          h('button', { class: 'btn prim', disabled: !pronta, onclick: () => {
            destino = registrarResposta(s, q, resp, conf); ultimo = q.id;
            if (s.feedback === 'cada') { feedback = true; mostrar(); window.scrollTo(0, 0); } else proxima();
          } }, pronta ? 'Confirmar resposta' : `Falta marcar ${falta}`)));
    } else {
      corpo.push(
        cartaoGabarito(q, s.respostas[id].resp),
        h('div', { class: 'rodape' }, h('button', { class: 'btn prim', onclick: proxima }, atualId(s) ? 'Próxima questão' : 'Ver resultado')));
    }
    raiz.replaceChildren(frag(...corpo));
    tick();
  };
  mostrar();
  return raiz;
}
