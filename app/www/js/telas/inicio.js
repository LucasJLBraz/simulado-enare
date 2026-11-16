import { h, fmtSeg } from '../dom.js';
import { ctx } from '../ctx.js';
import { revisaoDoDia, minutosEstimados, resumoCaderno, fraseCaderno, hojeISO, diasEntre } from '../../logica/revisao.js';
import { diagnostico } from '../../logica/dominio.js';
import { iniciar, retomar } from '../sessao.js';
import { curto } from './comum.js';

export function inicio() {
  const e = ctx.estado;
  const hoje = hojeISO();
  const visivel = ([id]) => ctx.porId.has(id) && (e.config.mini.apostila || ctx.porId.get(id).origem.tipo === 'oficial');
  const prog = Object.fromEntries(Object.entries(e.progresso).filter(visivel));
  const ids = revisaoDoDia(prog, hoje);
  const caderno = fraseCaderno(resumoCaderno(prog), hoje);
  const min = minutosEstimados(ids, e.progresso);
  const diag = diagnostico(ctx.questoes, ctx.topicos, e.progresso);
  const foco = diag[0];
  const dias = e.config.dataProva ? diasEntre(hoje, e.config.dataProva) : null;
  const s = e.sessao;

  const comecarRevisao = () => {
    iniciar({ tipo: 'revisao', titulo: 'Revisão do dia', fila: ids, feedback: 'cada', porQuestaoSeg: 180 });
    ctx.ir('#/questao');
  };

  return h('div', {},
    h('h1', {}, 'Olá, bons estudos'),
    dias != null && h('p', { class: 'suave' }, dias >= 0 ? `Faltam ${dias} dias para a prova.` : 'A data da prova já passou. Atualize em Ajustes.'),
    s && h('div', { class: 'card destaque' },
      h('h2', {}, s.modo === 'prova' ? 'Simulado em andamento' : 'Sessão pausada'),
      h('p', {}, `${s.titulo}: ${Object.keys(s.respostas).length} de ${s.fila.length} questões respondidas.`),
      h('button', { class: 'btn prim', onclick: () => { retomar(s); ctx.ir('#/questao'); } }, 'Continuar'),
      h('button', { class: 'btn perigo', onclick: () => { if (confirm('Descartar esta sessão? As respostas já dadas continuam salvas.')) { e.sessao = null; ctx.salvar(); ctx.ir('#/'); } } }, 'Descartar sessão')),
    h('section', { class: 'card destaque' },
      h('h2', {}, 'Revisão do dia'),
      ids.length
        ? [h('div', { class: 'grande' }, `${ids.length} ${ids.length === 1 ? 'questão' : 'questões'}`),
          h('p', { class: 'suave' }, `Cerca de ${min} minutos.`),
          caderno && h('p', { class: 'suave' }, caderno),
          h('button', { class: 'btn prim', onclick: comecarRevisao }, 'Começar revisão')]
        : [h('p', {}, caderno ? 'Nada para revisar hoje.' : 'Nada para revisar hoje. Resolva um mini-simulado para alimentar o caderno de erros.'),
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
      h('h2', {}, 'O que estudar'),
      h('p', { class: 'suave' }, 'Tópicos em ordem de prioridade, com o motivo de cada um.'),
      h('a', { class: 'btn', href: '#/estudar' }, 'Ver tópicos')));
}
