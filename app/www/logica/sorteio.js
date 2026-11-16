export function embaralhar(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Inéditas antes de repetir. vistos: Set de ids já resolvidos.
export function sortear(pool, vistos, n, rng = Math.random) {
  const ineditas = embaralhar(pool.filter((q) => !vistos.has(q.id)), rng);
  const repetidas = embaralhar(pool.filter((q) => vistos.has(q.id)), rng);
  return [...ineditas, ...repetidas].slice(0, n);
}
