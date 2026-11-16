import { h } from '../dom.js';
import { ctx } from '../ctx.js';
import { agendarLembrete, entregarArquivo } from '../plugins.js';
import { normalizar } from '../estado.js';
import { limparContestacoesAntigas } from '../../logica/marcacoes.js';
import { hojeISO } from '../../logica/revisao.js';

export function ajustes() {
  const e = ctx.estado;
  const msg = h('p', { class: 'suave', role: 'status' });
  const dizer = (t) => { msg.textContent = t; };
  const nomeArq = (p) => `${p}-${hojeISO()}.json`;

  const lembrete = async () => {
    const r = await agendarLembrete(e.config.lembrete.ativo, e.config.lembrete.hora);
    if (r.ok) dizer(e.config.lembrete.ativo ? `Lembrete diário às ${e.config.lembrete.hora}.` : 'Lembrete desligado.');
    else if (r.motivo === 'navegador') dizer('Lembrete salvo. Ele só toca no app instalado no celular.');
    else if (r.motivo === 'permissao') dizer('O Android não deixou o app mostrar notificações. Libere nas configurações do aparelho.');
    else dizer('Não foi possível agendar o lembrete.');
  };

  const enviar = async () => {
    const dados = { tipo: 'marcacoes', gerado_em: new Date().toISOString(), versao_banco: ctx.meta.versao_banco,
      contestacoes: e.contestacoes, confirmacoes: e.confirmacoes, progresso: e.progresso };
    dizer(`Arquivo ${await entregarArquivo(nomeArq('marcacoes'), JSON.stringify(dados))}.`);
  };
  const backup = async () => dizer(`Backup ${await entregarArquivo(nomeArq('backup-simulado'), JSON.stringify(e))}.`);

  const restaurar = async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || d.versao !== 1 || !d.progresso || !d.config) throw new Error('formato');
      if (!confirm('Restaurar este backup? O progresso atual neste aparelho será substituído.')) return;
      ctx.estado = normalizar(d);
      limparContestacoesAntigas(ctx.estado, ctx.questoes);
      ctx.salvar();
      dizer('Backup restaurado.');
      ctx.ir('#/');
    } catch { dizer('Este arquivo não parece um backup do app.'); }
  };

  return h('div', {},
    h('h1', {}, 'Ajustes'),
    h('div', { class: 'card' },
      h('label', { class: 'campo', for: 'dp' }, 'Data da prova'),
      h('input', { id: 'dp', type: 'date', value: e.config.dataProva || '', onchange: (ev) => { e.config.dataProva = ev.target.value || null; ctx.salvar(); dizer('Data salva.'); } }),
      h('p', { class: 'suave' }, 'Define a distância entre as revisões. Sem data, as revisões voltam a cada 7 dias.')),
    h('div', { class: 'card' },
      h('label', { class: 'interruptor' }, h('span', {}, 'Lembrete diário'),
        h('input', { type: 'checkbox', checked: e.config.lembrete.ativo, onchange: (ev) => { e.config.lembrete.ativo = ev.target.checked; ctx.salvar(); lembrete(); } })),
      h('label', { class: 'campo', for: 'hr' }, 'Horário'),
      h('input', { id: 'hr', type: 'time', value: e.config.lembrete.hora, onchange: (ev) => { e.config.lembrete.hora = ev.target.value || '20:00'; ctx.salvar(); if (e.config.lembrete.ativo) lembrete(); } })),
    h('div', { class: 'card' },
      h('h2', {}, 'Seus dados'),
      h('p', { class: 'suave' }, `Comentários que você marcou como errados: ${Object.keys(e.contestacoes).length}. Envie o arquivo para quem cuida do banco refazer esses comentários.`),
      h('button', { class: 'btn', onclick: enviar }, 'Enviar minhas marcações'),
      h('button', { class: 'btn', onclick: backup }, 'Fazer backup'),
      h('label', { class: 'btn', for: 'rest' }, 'Restaurar backup'),
      h('input', { id: 'rest', type: 'file', accept: 'application/json,.json', hidden: true, onchange: restaurar })),
    h('button', { class: 'btn', onclick: () => ctx.ir('#/onboarding') }, 'Ver a apresentação do app de novo'),
    msg,
    h('p', { class: 'suave' }, `Banco de questões versão ${ctx.meta.versao_banco}, ${ctx.questoes.length} questões.`));
}
