import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intervaloDias, atualizarCaderno, revisaoDoDia, somaDias, diasEntre, minutosEstimados } from '../www/logica/revisao.js';
import { dominio, estado, pesosTopicos, diagnostico, motivo } from '../www/logica/dominio.js';
import { sortear } from '../www/logica/sorteio.js';
import { montar, provaReal, edicoes, avisosPendentes, tempoTotalPadrao } from '../www/logica/simulado.js';
import { ritmo, refSegPorQuestao } from '../www/logica/ritmo.js';
import { contestacaoAtiva, limparContestacoesAntigas, marcar } from '../www/logica/marcacoes.js';

const Q = (id, o = {}) => ({
  id, parte: 'gerais', topicos: ['a'],
  origem: { tipo: 'oficial', exame: 'ENARE', edicao: '2024/2025', prova: 'P1', numero: 1 },
  comentario: { versao: 1 }, ...o,
});

test('intervalo de revisão', () => {
  assert.equal(intervaloDias(null), 7);
  assert.equal(intervaloDias(-3), 7);
  assert.equal(intervaloDias(100), 15);
  assert.equal(intervaloDias(10), 2);
  assert.equal(intervaloDias(1), 1); // 0,15 arredonda a 0, piso 1
  assert.equal(intervaloDias(400), 30); // teto
  assert.equal(somaDias('2026-02-27', 2), '2026-03-01');
  assert.equal(diasEntre('2026-01-01', '2026-01-31'), 30);
});

test('caderno de erros: entrada e saída', () => {
  const h = '2026-05-01';
  assert.deepEqual(atualizarCaderno(null, { certo: false, conf: 'certeza' }, h, 100), { proxima: '2026-05-16', destaque: true });
  assert.deepEqual(atualizarCaderno(null, { certo: false, conf: 'chutei' }, h, null), { proxima: '2026-05-08', destaque: false });
  assert.deepEqual(atualizarCaderno(null, { certo: true, conf: 'duvida' }, h, null), { proxima: '2026-05-08', destaque: false });
  assert.notEqual(atualizarCaderno(null, { certo: true, conf: 'chutei' }, h, null), null);
  assert.equal(atualizarCaderno({ proxima: h }, { certo: true, conf: 'certeza' }, h, null), null); // sai
  assert.equal(atualizarCaderno(null, { certo: true, conf: 'certeza' }, h, null), null); // não entra
  // errar de novo: dia seguinte
  assert.equal(atualizarCaderno({ proxima: h }, { certo: false, conf: 'duvida' }, h, 100).proxima, '2026-05-02');
});

test('revisão do dia e estimativa', () => {
  const p = { a: { caderno: { proxima: '2026-05-01' } }, b: { caderno: { proxima: '2026-05-03' } }, c: {}, d: { caderno: { proxima: '2026-04-20' } } };
  assert.deepEqual(revisaoDoDia(p, '2026-05-01'), ['d', 'a']);
  assert.equal(minutosEstimados(['a', 'd'], p), 6); // 2 x 180 s
});

test('domínio, estado e prioridade', () => {
  const r = (certo, conf) => ({ certo, conf });
  assert.equal(dominio([]), 0.5);
  // certeza+acerto=1, dúvida+acerto=0,5, chutei+acerto=0, erro=0 -> (1,5+1)/(4+2)
  assert.ok(Math.abs(dominio([r(true, 'certeza'), r(true, 'duvida'), r(true, 'chutei'), r(false, 'certeza')]) - 2.5 / 6) < 1e-12);
  assert.equal(estado(0.9, 4), 'quase_la'); // n < 5 nunca domina nem é base fraca
  assert.equal(estado(0.8, 5), 'domina');
  assert.equal(estado(0.39, 5), 'base_fraca');
  assert.equal(estado(0.5, 50), 'quase_la');

  const qs = [Q('1', { topicos: ['a'] }), Q('2', { topicos: ['a'] }), Q('3', { topicos: ['b'] }), Q('4', { topicos: ['b'] }),
    Q('x', { topicos: ['b'], origem: { tipo: 'apostila', material: 'M' } })];
  const pesos = pesosTopicos(qs);
  assert.equal(pesos.a, 0.5); // apostila não conta no peso
  assert.equal(pesos.b, 0.5);
  const topicos = [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }];
  const errou = (n) => ({ respostas: Array.from({ length: n }, () => r(false, 'certeza')) });
  const dom = (n) => ({ respostas: Array.from({ length: n }, () => r(true, 'certeza')) });
  const prog = { 1: errou(6), 3: dom(8) }; // a: base fraca; b: já domina (9/10)
  const d = diagnostico(qs, topicos, prog);
  assert.deepEqual(d.map((t) => t.id), ['a']); // domina sai da lista
  assert.equal(d[0].estado, 'base_fraca');
  assert.ok(Math.abs(d[0].prioridade - 0.5 * (1 - 1 / 8)) < 1e-12);
  assert.equal(motivo(d[0]), 'cai 50% da prova e você erra 100%');
  // diagnóstico de apostila é separado
  const dap = diagnostico(qs, topicos, { x: errou(1), 1: errou(6) }, { apostila: true });
  assert.equal(dap.find((t) => t.id === 'b').n, 1);
  assert.equal(dap.find((t) => t.id === 'a').n, 0);
});

test('sorteio: inéditas antes de repetir', () => {
  const pool = ['1', '2', '3', '4', '5', '6'].map((id) => Q(id));
  const vistos = new Set(['1', '2', '3']);
  for (let i = 0; i < 20; i++) {
    const s = sortear(pool, vistos, 4).map((q) => q.id);
    assert.equal(s.length, 4);
    assert.ok(['4', '5', '6'].every((id) => s.slice(0, 3).includes(id)));
    assert.ok(vistos.has(s[3]));
  }
  assert.equal(sortear(pool, new Set(), 100).length, 6);
});

test('simulado montado e prova real', () => {
  const f = { gerais: 2, especificos: 3, minutos: 15 };
  const qs = [
    ...[1, 2, 3].map((n) => Q('g' + n, { origem: { tipo: 'oficial', exame: 'ENARE', edicao: '2023/2024', prova: 'P1', numero: n } })),
    ...[1, 2, 3, 4].map((n) => Q('e' + n, { parte: 'especificos', origem: { tipo: 'oficial', exame: 'ENARE', edicao: '2024/2025', prova: 'P1', numero: 10 - n } })),
    Q('ap', { parte: 'especificos', origem: { tipo: 'apostila', material: 'M' } }),
    Q('out', { origem: { tipo: 'oficial', exame: 'OUTRA', edicao: 'x', prova: 'P', numero: 1 } }),
  ];
  const m = montar(qs, new Set(), f);
  assert.equal(m.questoes.filter((q) => q.parte === 'gerais').length, 2);
  assert.equal(m.questoes.filter((q) => q.parte === 'especificos').length, 3);
  assert.ok(m.questoes.every((q) => q.id !== 'ap' && q.id !== 'out'));
  assert.deepEqual(m.faltam, { gerais: 0, especificos: 0 });
  assert.deepEqual(montar(qs.slice(0, 3), new Set(), f).faltam, { gerais: 0, especificos: 3 });
  assert.deepEqual(provaReal(qs, '2024/2025').map((q) => q.origem.numero), [6, 7, 8, 9]); // ordem original
  assert.deepEqual(edicoes(qs).map((e) => [e.edicao, e.n]), [['2024/2025', 4], ['2023/2024', 3]]);
  assert.equal(tempoTotalPadrao(100), 18000); // 3 min por questão
  // avisos aos 30 e 10 minutos finais
  assert.deepEqual(avisosPendentes(1800, 18000), [1800]);
  assert.deepEqual(avisosPendentes(600, 18000, [1800]), [600]);
  assert.deepEqual(avisosPendentes(900, 18000, [1800]), []);
  assert.deepEqual(avisosPendentes(500, 900), [600]); // total curto: só o de 10 min
});

test('ritmo', () => {
  const ref = refSegPorQuestao({ gerais: 20, especificos: 80, minutos: 300 });
  assert.equal(ref, 180);
  assert.equal(ritmo([], ref), null);
  assert.equal(ritmo([100, 120], ref).rotulo, 'mais rápido que a prova');
  assert.equal(ritmo([180, 190], ref).rotulo, 'no ritmo da prova');
  assert.equal(ritmo([300], ref).rotulo, 'mais lento que a prova');
});

test('contestação some quando o comentário ganha versão nova', () => {
  const est = { contestacoes: {}, confirmacoes: {} };
  const q = Q('1', { comentario: { versao: 2 } });
  marcar(est, q, 'contestar');
  assert.equal(est.contestacoes['1'].versao, 2);
  assert.ok(contestacaoAtiva(q, est));
  limparContestacoesAntigas(est, [q]);
  assert.ok(est.contestacoes['1']);
  limparContestacoesAntigas(est, [Q('1', { comentario: { versao: 3 } })]);
  assert.equal(est.contestacoes['1'], undefined);
  marcar(est, q, 'confirmar');
  assert.ok(est.confirmacoes['1'] && !est.contestacoes['1']);
});

test('retomar: modo prova segue o relógio de parede, treino retoma só se pausado', async () => {
  const { retomar } = await import('../www/js/sessao.js');
  const { ctx } = await import('../www/js/ctx.js');
  ctx.salvar = () => {};
  const p = { modo: 'prova', rodandoDesde: 1000, acumuladoSeg: 0 };
  retomar(p); assert.equal(p.rodandoDesde, 1000);
  const p2 = { modo: 'prova', rodandoDesde: null, acumuladoSeg: 5 };
  retomar(p2); assert.equal(p2.rodandoDesde, null);
  const t = { modo: null, rodandoDesde: null, acumuladoSeg: 5 };
  retomar(t); assert.ok(t.rodandoDesde);
  const t2 = { modo: null, rodandoDesde: 1000, acumuladoSeg: 5 };
  retomar(t2); assert.equal(t2.rodandoDesde, 1000);
});

test('esperadas: maior número por prova', async () => {
  const { esperadas } = await import('../www/logica/simulado.js');
  const o = (prova, numero) => ({ origem: { prova, numero } });
  assert.equal(esperadas([o('A', 1), o('A', 60), o('B', 3)]), 63);
});
