import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinoCaderno, mensagemFeedback, resumoCaderno, fraseCaderno } from '../www/logica/revisao.js';

const H = '2026-05-01';

test('mensagem de feedback usa a regra do caderno', () => {
  const msg = (entrada, resp, dias) => mensagemFeedback(resp, destinoCaderno(entrada, resp, H, dias));
  assert.equal(msg(null, { certo: false, conf: 'certeza' }, 100), 'Errou com certeza. Volta em 15 dias no caderno de erros.');
  assert.equal(msg(null, { certo: true, conf: 'chutei' }, 100), 'Acertou chutando. Volta em 15 dias no caderno de erros.');
  assert.equal(msg(null, { certo: true, conf: 'duvida' }, null), 'Acertou com dúvida. Volta em 7 dias no caderno de erros.');
  assert.equal(msg({ proxima: H }, { certo: false, conf: 'duvida' }, 100), 'Errou com dúvida. Volta amanhã no caderno de erros.');
  assert.equal(msg(null, { certo: true, conf: 'certeza' }, 100), 'Acertou com certeza. Não volta para revisão.');
  assert.equal(msg({ proxima: H }, { certo: true, conf: 'certeza' }, 100), 'Acertou com certeza. Sai do caderno de erros.');
  assert.equal(destinoCaderno(null, { certo: false, conf: 'chutei' }, H, 100).proxima, '2026-05-16');
});

test('resumo do caderno para o Início', () => {
  const p = { a: { caderno: { proxima: '2026-05-10' } }, b: { caderno: { proxima: '2026-05-03' } }, c: {} };
  assert.deepEqual(resumoCaderno(p), { n: 2, proxima: '2026-05-03' });
  assert.equal(fraseCaderno(resumoCaderno(p), H), 'No caderno: 2 questões. Próxima revisão: 03/05.');
  assert.equal(fraseCaderno({ n: 1, proxima: '2026-04-30' }, H), 'No caderno: 1 questão. Próxima revisão: hoje.');
  assert.equal(fraseCaderno(resumoCaderno({}), H), null);
});

import { revisaoDoDia, metaHoje, fraseAmanha } from '../www/logica/revisao.js';
import { antesDepois, errosCorrigidos, fraseProgresso, fraseCorrigidos, fraseAntesDepois, resumoPorTopico } from '../www/logica/progresso.js';
import { estado } from '../www/logica/dominio.js';
import { normalizar } from '../www/js/estado.js';

const R = (quando, certo, conf = 'certeza') => ({ quando, certo, conf, seg: 30 });
const Q = (id, t = 'a') => ({ id, topicos: [t], origem: { tipo: 'oficial', exame: 'ENARE' } });

test('ordem da revisão do dia: erro com certeza primeiro, depois atraso', () => {
  const p = {
    a: { caderno: { proxima: '2026-04-20', destaque: false } },
    b: { caderno: { proxima: '2026-05-01', destaque: true } },
    c: { caderno: { proxima: '2026-04-25', destaque: true } },
    d: { caderno: { proxima: '2026-05-02', destaque: true } }, // ainda não venceu
  };
  assert.deepEqual(revisaoDoDia(p, H), ['c', 'b', 'a']);
});

test('meta do dia e o que muda amanhã', () => {
  assert.deepEqual(metaHoje({ data: H, feitas: 4 }, 21, H), { feitas: 4, total: 25 });
  assert.deepEqual(metaHoje({ data: '2026-04-30', feitas: 9 }, 5, H), { feitas: 0, total: 5 }); // outro dia zera
  assert.deepEqual(metaHoje(null, 0, H), { feitas: 0, total: 0 });
  const p = { a: {}, b: { caderno: { proxima: '2026-05-10' } }, c: { caderno: { proxima: '2026-05-02' } }, d: { caderno: { proxima: '2026-05-01' } } };
  assert.deepEqual(fraseAmanha(p, ['a', 'b', 'c'], H), [
    '1 questão saiu do caderno (acerto com certeza).',
    '2 questões voltam para revisão, a primeira amanhã.',
    'Amanhã: 2 questões para revisar.']);
  assert.deepEqual(fraseAmanha({ b: p.b }, ['b'], H), ['1 questão volta para revisão, a primeira em 10/05.', 'Amanhã: nenhuma questão para revisar.']);
});

test('erros com certeza corrigidos', () => {
  const p = {
    a: { respostas: [R('d1', false), R('d2', true)] }, // corrigido
    b: { respostas: [R('d1', false), R('d2', true, 'duvida')] }, // acerto sem certeza: ainda aberto
    c: { respostas: [R('d1', true), R('d2', false, 'duvida')] }, // nunca errou com certeza
    d: { respostas: [R('d1', false), R('d2', false), R('d3', true), R('d4', false), R('d5', true)] }, // dois erros, dois acertos
  };
  assert.deepEqual(errosCorrigidos(p), { corrigidos: 3, pendentes: 1 });
  assert.equal(fraseCorrigidos({ corrigidos: 1, pendentes: 0 }), 'Você corrigiu 1 erro que cometeu com certeza.');
  assert.equal(fraseCorrigidos({ corrigidos: 4, pendentes: 3 }), 'Você corrigiu 4 erros que cometeu com certeza. Ainda faltam corrigir 3.');
});

test('antes e depois por tópico: janela de 2 semanas e mínimo de 5 respostas', () => {
  const hoje = '2026-05-30';
  const antigas = ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05'].map((d) => R(d, false));
  const recentes = ['2026-05-20', '2026-05-25', '2026-05-26', '2026-05-27', '2026-05-30'].map((d) => R(d, true));
  const qs = [Q('1'), Q('2', 'b'), { ...Q('3'), origem: { tipo: 'apostila' } }];
  const ad = antesDepois(qs, { 1: { respostas: [...antigas, ...recentes] }, 2: { respostas: recentes.slice(0, 4) }, 3: { respostas: recentes } }, hoje);
  assert.equal(ad.a.antes, 14); // (0+1)/(5+2)
  assert.equal(ad.a.depois, 86); // (5+1)/(5+2)
  assert.equal(fraseAntesDepois(ad.a), '14% → 86%');
  assert.equal(ad.b.depois, null); // 4 respostas: sem porcentagem
  assert.equal(fraseAntesDepois(ad.b), 'poucas questões ainda');
  assert.equal(ad.a.n, 10); // apostila fora
  // limite da janela: 13 dias atrás ainda é recente, 14 já é antes
  const lim = antesDepois([Q('1')], { 1: { respostas: [R('2026-05-17', true), R('2026-05-16', true)] } }, hoje);
  assert.equal(lim.a.n, 2);
});

test('rótulo só com 5 respostas, resumo por tópico e linha do Início', () => {
  assert.equal(estado(0.9, 4), 'sem_dados');
  assert.equal(estado(0.9, 5), 'domina');
  const porId = new Map([['1', Q('1', 'a')], ['2', Q('2', 'a')], ['3', Q('3', 'b')]]);
  const itens = [{ qid: '1', resp: 'A', certo: false }, { qid: '2', resp: 'A', certo: true }, { qid: '3', resp: null }];
  assert.deepEqual(resumoPorTopico(itens, porId), [{ id: 'a', n: 2, acertos: 1 }]);
  assert.match(fraseProgresso({}, H), /depois das primeiras respostas/);
  assert.equal(fraseProgresso({ a: { respostas: [R(H, false)] } }, H), 'Nas últimas 2 semanas você respondeu 1 questão. Erros com certeza corrigidos: 0.');
});

test('estado antigo continua abrindo', () => {
  const velho = { versao: 1, config: { dataProva: '2026-12-01', onboardingVisto: true }, progresso: { x: { respostas: [] } }, historico: [], sessao: null };
  const n = normalizar(velho);
  assert.deepEqual(n.revisaoHoje, { data: null, feitas: 0 });
  assert.equal(n.config.ocultarRelogio, false);
  assert.equal(n.config.dataProva, '2026-12-01');
});
