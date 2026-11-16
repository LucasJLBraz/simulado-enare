// Todo o estado fica numa chave versionada do localStorage. Progresso indexado pelo id da questão.
export const CHAVE = 'simulado-enare:v1';

export const vazio = () => ({
  versao: 1,
  config: { dataProva: null, lembrete: { ativo: false, hora: '20:00' }, onboardingVisto: false, ocultarRelogio: false,
    mini: { n: 10, topico: 'misturado', feedback: 'cada', timer: false, apostila: false } },
  progresso: {}, // id -> { respostas: [{quando, resp, certo, conf, seg}], caderno?: {proxima, destaque} }
  contestacoes: {}, // id -> { versao }
  confirmacoes: {}, // id -> { versao }
  historico: [], // sessões terminadas
  revisaoHoje: { data: null, feitas: 0 }, // revisões do dia já respondidas hoje (meta "Hoje: X de N")
  sessao: null, // sessão em andamento ou pausada
});

export function normalizar(s) {
  const v = vazio();
  if (!s || typeof s !== 'object') return v;
  return { ...v, ...s, config: { ...v.config, ...s.config, lembrete: { ...v.config.lembrete, ...s.config?.lembrete }, mini: { ...v.config.mini, ...s.config?.mini } } };
}

export function carregar() {
  try { return normalizar(JSON.parse(localStorage.getItem(CHAVE))); } catch { return vazio(); }
}
export function salvar(estado) {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); return true; } catch { return false; }
}
