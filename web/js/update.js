// Nieuwe versie? De app kijkt op GitHub Pages welke versie daar staat.
// De web-app werkt zichzelf vanzelf bij; de Android-app laat een downloadknop zien bij Ouders.
export const PAGES = 'https://ramonnv.github.io/letterbos/';
export const APK = 'https://github.com/Ramonnv/letterbos/releases/latest/download/Letterbos.apk';
export const info = { local: null, remote: null };
export async function checkUpdate() {
  try { info.local = await (await fetch('version.json', { cache: 'no-store' })).json(); } catch (e) { info.local = { build: 0, versie: 'test' }; }
  if (!window.LB_APP) return false;
  try { info.remote = await (await fetch(PAGES + 'version.json', { cache: 'no-store' })).json(); } catch (e) { return false; }
  return hasUpdate();
}
export const hasUpdate = () => !!(window.LB_APP && info.remote && info.local && info.remote.build > info.local.build);
