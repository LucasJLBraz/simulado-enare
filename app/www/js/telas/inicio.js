import { h } from '../dom.js';
import { ctx } from '../ctx.js';
import { minutosEstimados, resumoCaderno, fraseCaderno, metaHoje, hojeISO, diasEntre } from '../../logica/revisao.js';
import { diagnostico } from '../../logica/dominio.js';
import { fraseProgresso } from '../../logica/progresso.js';
import { iniciar, retomar } from '../sessao.js';
import { curto, vencidasHoje, confirmarNova } from './comum.js';
const duracao = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);

export function inicio() {
  const e = ctx.estado;
  const hoje = hojeISO();
  const { prog, ids } = vencidasHoje(hoje);
  const caderno = fraseCaderno(resumoCaderno(prog), hoje);
  const meta = metaHoje(e.revisaoHoje, ids.length, hoje);
  const diag = diagnostico(ctx.questoes, ctx.topicos, e.progresso);
  const foco = diag[0];
  const dias = e.config.dataProva ? diasEntre(hoje, e.config.dataProva) : null;
  const s = e.sessao;

  const comecarRevisao = (n) => {
    if (!confirmarNova()) return;
    iniciar({ tipo: 'revisao', titulo: 'Revisão do dia', fila: ids.slice(0, n), feedback: 'cada', porQuestaoSeg: 180 });
    ctx.ir('#/questao');
  };
  // 10, 25 ou todas; erros com certeza vêm primeiro (ordem de revisaoDoDia).
  const tamanhos = [10, 25].filter((n) => n < ids.length).concat(ids.length);
  const botao = (n, k) => h('button', { class: 'btn' + (k === 0 && !s ? ' prim' : ''), onclick: () => comecarRevisao(n) },
    tamanhos.length === 1 ? 'Começar revisão' : ['Revisar ', n === ids.length ? `todas as ${n} questões` : `${n} questões`, ', cerca de ', h('span', { class: 'sq' }, duracao(minutosEstimados(ids.slice(0, n), e.progresso)))]);

  return h('div', {},
    h('h1', {}, 'Olá, bons estudos'),
    dias != null && h('p', { class: 'suave' }, dias >= 0 ? `Faltam ${dias} dias para a prova.` : 'A data da prova já passou. Atualize em Ajustes.'),
    s && h('div', { class: 'card destaque' },
      h('h2', {}, s.modo === 'prova' ? 'Simulado em andamento' : 'Sessão pausada'),
      h('p', {}, `${s.titulo} (${Object.keys(s.respostas).length} de ${s.fila.length} respondidas).`),
      h('button', { class: 'btn prim', onclick: () => { retomar(s); ctx.ir('#/questao'); } }, 'Continuar'),
      h('button', { class: 'link-txt', onclick: () => { if (confirm('Descartar esta sessão? As respostas já dadas continuam salvas.')) { e.sessao = null; ctx.salvar(); ctx.ir('#/'); } } }, 'Descartar sessão')),
    h('section', { class: 'card destaque' },
      h('h2', {}, 'Revisão do dia'),
      meta.total > 0 && [h('p', {}, `Para revisar hoje: ${meta.total} ${meta.total === 1 ? 'questão' : 'questões'} (feitas: ${meta.feitas}).`),
        h('div', { class: 'barra' }, h('div', { style: `width:${(meta.feitas / meta.total) * 100}%` }))],
      ids.length
        ? [caderno && h('p', { class: 'suave' }, caderno),
          tamanhos.map((n, k) => botao(n, k))]
        : [h('p', {}, meta.feitas ? 'Revisão do dia feita.' : caderno ? 'Nada para revisar hoje.' : 'Nada para revisar hoje. Resolva um mini-simulado para alimentar o caderno de erros.'),
          caderno && h('p', { class: 'suave' }, caderno)]),
    h('section', { class: 'card' },
      h('h2', {}, 'Mini-simulado'),
      foco && h('p', {}, `Foque em: ${curto(foco)}.`),
      foco
        ? h('a', { class: 'btn prim', href: `#/mini?topico=${foco.id}` }, 'Treinar este tópico')
        : null,
      h('a', { class: 'btn', href: '#/mini' }, 'Escolher o mini-simulado')),
    h('section', { class: 'card' },
      h('h2', {}, 'Simulado completo'),
      h('p', { class: 'suave' }, 'Uma prova real do ENARE ou um simulado montado com várias edições, no tempo da prova.'),
      h('a', { class: 'btn', href: '#/simulado' }, 'Montar simulado')),
    h('section', { class: 'card' },
      h('h2', {}, 'Seu progresso'),
      h('p', { class: 'suave' }, fraseProgresso(e.progresso, hoje)),
      h('a', { class: 'btn', href: '#/progresso' }, 'Ver progresso')),
    h('section', { class: 'card' },
      h('h2', {}, 'O que estudar'),
      h('p', { class: 'suave' }, 'Tópicos em ordem de prioridade, com o motivo de cada um.'),
      h('a', { class: 'btn', href: '#/estudar' }, 'Ver tópicos')));
}
