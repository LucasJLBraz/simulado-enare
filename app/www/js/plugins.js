// Plugins do Capacitor, sempre protegidos: no navegador do PC o app roda sem eles.
const P = (n) => window.Capacitor?.Plugins?.[n];
export const nativo = () => !!window.Capacitor?.isNativePlatform?.();

export async function agendarLembrete(ativo, hora) {
  const LN = P('LocalNotifications');
  if (!nativo() || !LN) return { ok: false, motivo: 'navegador' };
  try {
    await LN.cancel({ notifications: [{ id: 1 }] });
    if (!ativo) return { ok: true };
    const perm = await LN.requestPermissions();
    if (perm.display !== 'granted') return { ok: false, motivo: 'permissao' };
    const [hour, minute] = hora.split(':').map(Number);
    await LN.schedule({ notifications: [{ id: 1, title: 'Simulado ENARE Psico', body: 'Hora de estudar. Veja a revisão do dia.',
      schedule: { on: { hour, minute }, allowWhileIdle: true } }] });
    return { ok: true };
  } catch (e) { return { ok: false, motivo: String(e) }; }
}

// Salva um arquivo de texto: no celular abre o compartilhamento; no PC baixa.
export async function entregarArquivo(nome, texto) {
  const FS = P('Filesystem'), SH = P('Share');
  if (nativo() && FS && SH) {
    try {
      const r = await FS.writeFile({ path: nome, data: texto, directory: 'CACHE', encoding: 'utf8' });
      await SH.share({ title: nome, url: r.uri, dialogTitle: 'Enviar arquivo' });
      return 'compartilhado';
    } catch (e) { if (/cancel/i.test(String(e))) return 'cancelado'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  a.download = nome;
  document.body.append(a); a.click(); a.remove();
  return 'baixado';
}
