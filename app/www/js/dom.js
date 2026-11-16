// Pequeno helper de DOM. Texto sempre entra como texto (nunca como HTML).
// replaceChildren/append imprimem "false" de `cond && el`; frag() descarta esses valores.
export function frag(...kids) {
  const f = document.createDocumentFragment();
  for (const c of kids.flat(9)) if (c != null && c !== false) f.append(c.nodeType ? c : String(c));
  return f;
}

export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && k !== 'list') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}

export function fmtSeg(s) {
  s = Math.max(0, Math.round(s));
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return hh ? `${hh}:${p(mm)}:${p(ss)}` : `${p(mm)}:${p(ss)}`;
}
export const fmtMin = (s) => {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? `${m} min${r ? ` ${r} s` : ''}` : `${r} s`;
};

export function origemTexto(q) {
  const o = q.origem;
  return o.tipo === 'oficial'
    ? `${o.exame} ${o.edicao} · ${o.banca} · prova ${o.prova} · questão\u00a0${o.numero}`
    : `Apostila: ${o.material}`;
}

export function badgesOrigem(q) {
  return h('div', {},
    h('span', { class: q.origem.tipo === 'oficial' ? 'badge' : 'badge apost' }, origemTexto(q)),
    q.gabarito_status === 'provisorio' && h('span', { class: 'badge prov' }, 'Gabarito provisório'));
}

// Figura recortada da prova (pipeline/extrair.py). Fundo branco porque o recorte do PDF é branco.
export const figura = (q) => q.figura && h('img', { src: `banco/${q.figura}`, alt: 'Figura da questão, como aparece na prova', class: 'figura' });
