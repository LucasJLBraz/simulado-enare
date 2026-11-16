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
