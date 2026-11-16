// Estado compartilhado do app (banco carregado + estado do usuário).
import { salvar } from './estado.js';

export const ctx = {
  estado: null, questoes: [], porId: new Map(), topicos: [], meta: null,
  limpeza: null, // função chamada ao sair da tela atual (timers)
  salvar() { return salvar(this.estado); },
  ir(rota) { location.hash = rota; },
};
