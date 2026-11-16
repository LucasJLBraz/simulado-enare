// Diagnóstico por tópico: domínio, prioridade e estado.
export const pontos = ({ certo, conf }) => (!certo ? 0 : conf === 'certeza' ? 1 : conf === 'duvida' ? 0.5 : 0);

// Domínio = (soma + 1) / (n + 2), para não exagerar com poucas respostas.
export const dominio = (respostas) =>
  (respostas.reduce((s, r) => s + pontos(r), 0) + 1) / (respostas.length + 2);

export function estado(dom, n) {
  if (n < 5) return 'sem_dados';
  if (dom >= 0.8) return 'domina';
  if (dom < 0.4) return 'base_fraca';
  return 'quase_la';
}
export const ROTULO_ESTADO = { domina: 'Já domina', quase_la: 'Quase lá', base_fraca: 'Base fraca', sem_dados: 'Ainda sem dados' };

export const ehOficial = (q) => q.origem.tipo === 'oficial';

// Fração de cada tópico nas questões oficiais do ENARE.
export function pesosTopicos(questoes) {
  const enare = questoes.filter((q) => ehOficial(q) && q.origem.exame === 'ENARE');
  const peso = {};
  for (const q of enare) for (const t of q.topicos) peso[t] = (peso[t] || 0) + 1 / enare.length;
  return peso;
}

// apostila=false: só oficiais. apostila=true: só apostila (diagnóstico separado).
// Devolve tópicos ordenados por prioridade, sem os que já domina.
export function diagnostico(questoes, topicos, progresso, { apostila = false } = {}) {
  const pesos = pesosTopicos(questoes);
  const porId = new Map(questoes.map((q) => [q.id, q]));
  const resp = {};
  for (const [id, p] of Object.entries(progresso)) {
    const q = porId.get(id);
    if (!q || ehOficial(q) === apostila) continue;
    for (const r of p.respostas || []) for (const t of q.topicos) (resp[t] ||= []).push(r);
  }
  return topicos
    .map((t) => {
      const rs = resp[t.id] || [];
      const dom = dominio(rs);
      const peso = pesos[t.id] || 0;
      const erro = rs.length ? rs.filter((r) => !r.certo).length / rs.length : null;
      return { ...t, n: rs.length, dominio: dom, peso, erro, prioridade: peso * (1 - dom), estado: estado(dom, rs.length) };
    })
    .filter((t) => t.estado !== 'domina')
    .sort((a, b) => b.prioridade - a.prioridade);
}

export function motivo(t) {
  const cai = Math.round(t.peso * 100);
  if (t.erro == null) return `cai ${cai}% da prova e você ainda não respondeu nenhuma questão`;
  return `cai ${cai}% da prova e você erra ${Math.round(t.erro * 100)}%`;
}
