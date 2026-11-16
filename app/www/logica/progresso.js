// Progresso: antes e depois por tópico, erros com certeza corrigidos e resumo por tópico de uma sessão.
import { dominio, ehOficial } from './dominio.js';
import { diasEntre } from './revisao.js';

export const JANELA_DIAS = 14;
export const MIN_RESPOSTAS = 5;

// Por tópico: domínio nas últimas 2 semanas (depois) contra tudo o que veio antes (antes), só questões oficiais.
// Com menos de 5 respostas numa das partes não há porcentagem (null).
export function antesDepois(questoes, progresso, hoje) {
  const porId = new Map(questoes.map((q) => [q.id, q]));
  const t = {};
  for (const [id, p] of Object.entries(progresso)) {
    const q = porId.get(id);
    if (!q || !ehOficial(q)) continue;
    for (const r of p.respostas || []) for (const tp of q.topicos) {
      const x = (t[tp] ||= { antes: [], depois: [] });
      (diasEntre(r.quando, hoje) < JANELA_DIAS ? x.depois : x.antes).push(r);
    }
  }
  const pct = (rs) => (rs.length >= MIN_RESPOSTAS ? Math.round(dominio(rs) * 100) : null);
  return Object.fromEntries(Object.entries(t).map(([k, x]) =>
    [k, { n: x.antes.length + x.depois.length, antes: pct(x.antes), depois: pct(x.depois) }]));
}

// Erro com certeza corrigido: depois de errar com certeza, a mesma questão é acertada com certeza.
export function errosCorrigidos(progresso) {
  let corrigidos = 0, pendentes = 0;
  for (const p of Object.values(progresso)) {
    let aberto = false;
    for (const r of p.respostas || []) {
      if (!r.certo && r.conf === 'certeza') aberto = true;
      else if (aberto && r.certo && r.conf === 'certeza') { corrigidos++; aberto = false; }
    }
    if (aberto) pendentes++;
  }
  return { corrigidos, pendentes };
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Linha de resumo do Início.
export function fraseProgresso(progresso, hoje) {
  let n = 0;
  for (const p of Object.values(progresso)) for (const r of p.respostas || []) if (diasEntre(r.quando, hoje) < JANELA_DIAS) n++;
  const { corrigidos } = errosCorrigidos(progresso);
  if (!n && !corrigidos) return 'Seu progresso aparece aqui depois das primeiras respostas.';
  return `Nas últimas 2 semanas você respondeu ${plural(n, 'questão', 'questões')}. Erros com certeza corrigidos: ${corrigidos}.`;
}

export function fraseCorrigidos({ corrigidos, pendentes }) {
  if (!corrigidos && !pendentes) return 'Você ainda não errou nenhuma questão com certeza.';
  return `Você corrigiu ${plural(corrigidos, 'erro', 'erros')} que cometeu com certeza.` + (pendentes ? ` Ainda faltam corrigir ${pendentes}.` : '');
}

// Texto do antes e depois de um tópico.
export function fraseAntesDepois(ad) {
  return ad && ad.antes != null && ad.depois != null ? `${ad.antes}% → ${ad.depois}%` : 'poucas questões ainda';
}

// Itens respondidos de uma sessão agrupados por tópico: [{ id, n, acertos }], quem mais perdeu primeiro.
export function resumoPorTopico(itens, porId) {
  const t = {};
  for (const it of itens) {
    const q = porId.get(it.qid);
    if (!q || !it.resp) continue;
    for (const tp of q.topicos) { const x = (t[tp] ||= { id: tp, n: 0, acertos: 0 }); x.n++; if (it.certo) x.acertos++; }
  }
  return Object.values(t).sort((a, b) => (b.n - b.acertos) - (a.n - a.acertos) || b.n - a.n);
}
