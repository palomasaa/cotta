// Camada que liga o app ao Firebase (login Google, banco Firestore, notificações)
import { firebaseConfig, VAPID_KEY, OWNER_EMAIL, FB } from "./firebase-config.js";
const { initializeApp } = await import(FB + "firebase-app.js");
const A = await import(FB + "firebase-auth.js");
const F = await import(FB + "firebase-firestore.js");
let M = null; try { M = await import(FB + "firebase-messaging.js"); } catch (_) {}

const app = initializeApp(firebaseConfig);
const auth = A.getAuth(app);
let fs;
try { fs = F.initializeFirestore(app, { ignoreUndefinedProperties: true, localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
catch (_) { fs = F.initializeFirestore(app, { ignoreUndefinedProperties: true }); }

const mapErr = e => ({ code: e && e.code === "permission-denied" ? "invalid_argument" : e && e.code === "resource-exhausted" ? "quota_exceeded" : "unavailable", message: String(e && e.message || e) });
const wrapDoc = s => ({ id: s.id, exists: s.exists(), data: () => s.data(), metadata: s.metadata });
const wrapQ = s => ({ docs: s.docs.map(wrapDoc), size: s.size, empty: s.empty, metadata: s.metadata });
const guard = p => p.catch(e => { throw mapErr(e); });
function mkDoc(path) {
  const r = F.doc(fs, path);
  return { id: r.id, path,
    get: async () => wrapDoc(await guard(F.getDoc(r))),
    set: d => guard(F.setDoc(r, d)), update: d => guard(F.updateDoc(r, d)), delete: () => guard(F.deleteDoc(r)),
    onSnapshot: (n, e) => F.onSnapshot(r, s => n(wrapDoc(s)), err => e && e(mapErr(err))),
    collection: p => mkCol(path + "/" + p) };
}
function mkQuery(base, cons) {
  return {
    where: (f, o, v) => mkQuery(base, [...cons, F.where(f, o, v)]),
    orderBy: (f, d) => mkQuery(base, [...cons, F.orderBy(f, d || "asc")]),
    limit: n => mkQuery(base, [...cons, F.limit(n)]),
    get: async () => wrapQ(await guard(F.getDocs(F.query(base, ...cons)))),
    onSnapshot: (n, e) => F.onSnapshot(F.query(base, ...cons), s => n(wrapQ(s)), err => e && e(mapErr(err)))
  };
}
function mkCol(path) {
  const c = F.collection(fs, path);
  return Object.assign(mkQuery(c, []), { path,
    doc: id => mkDoc(path + "/" + (id || F.doc(c).id)),
    add: async d => { const r = await guard(F.addDoc(c, d)); return mkDoc(path + "/" + r.id); } });
}
const db = { doc: mkDoc, collection: mkCol };

function initials(name, color) {
  const t = (name || "?").trim().split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' rx='32' fill='${color}'/><text x='32' y='40' font-family='Arial' font-size='24' font-weight='700' fill='#fff' text-anchor='middle'>${t}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
const COLORS = ["#6b2fb3", "#4338ca", "#0e7490", "#b07d2b", "#127a4b"];
const colorOf = id => COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

// ---------- tela de login
function loginScreen(msg) {
  let el = document.getElementById("jl-login");
  if (!el) {
    el = document.createElement("div"); el.id = "jl-login";
    el.innerHTML = `<style>#jl-login{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:radial-gradient(80% 120% at 100% 0%,#3b3fd6 0%,transparent 55%),radial-gradient(60% 100% at 0% 100%,#6b2fb3 0%,transparent 60%),#0b0d2e;color:#f3f3fa;font-family:Manrope,system-ui,sans-serif}
#jl-login .box{max-width:400px;width:100%;display:grid;gap:16px;text-align:center}
#jl-login h1{font-family:"Bricolage Grotesque",Manrope,sans-serif;font-size:34px;margin:0}
#jl-login p{margin:0;color:#c9c9e6;line-height:1.5}
#jl-login button{border:0;border-radius:12px;padding:13px 18px;font:700 15px Manrope,sans-serif;background:#fff;color:#16172b;display:flex;gap:10px;align-items:center;justify-content:center;cursor:pointer}
#jl-login .err{color:#ffb4b9;font-size:14px;min-height:1.2em}</style>
<div class="box"><img src="icons/icon-192.png" alt="" width="84" height="84" style="justify-self:center;border-radius:20px"><h1>Jay-Loma</h1><p>Gestão das sócias Paloma &amp; Jay — Jay-Loma Lojas e Jay Personal Chef.</p>
<button type="button" id="jl-google"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.6 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Entrar com Google</button>
<p class="err" id="jl-err"></p><p style="font-size:13px">Só quem a administradora aprovar consegue ver os dados.</p></div>`;
    document.body.append(el);
    el.querySelector("#jl-google").onclick = async () => {
      const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
      try { await A.signInWithPopup(auth, p); }
      catch (e) { if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) A.signInWithRedirect(auth, p); else el.querySelector("#jl-err").textContent = "Não deu para entrar. Tente de novo."; }
    };
  }
  el.querySelector("#jl-err").textContent = msg || ""; el.hidden = false;
}

const user0 = await new Promise(res => { const un = A.onAuthStateChanged(auth, u => { if (u) { un(); res(u); } else loginScreen(); }); });
A.onAuthStateChanged(auth, u => { if (!u) location.reload(); });
document.getElementById("jl-login")?.remove();
const isOwner = !!(user0.email && user0.email.toLowerCase() === OWNER_EMAIL && user0.emailVerified);
F.setDoc(F.doc(fs, "perfis/" + user0.uid), { nome: user0.displayName || "", foto: user0.photoURL || "", email: (user0.email || "").toLowerCase(), atualizadoEm: new Date().toISOString() }, { merge: true }).catch(() => {});

const perfCache = new Map();
const user = {
  me: async () => ({ id: user0.uid, name: user0.displayName || "", email: (user0.email || "").toLowerCase(), avatarUrl: user0.photoURL || initials(user0.displayName, colorOf(user0.uid)), color: colorOf(user0.uid), isOwner, canEdit: isOwner }),
  id: async () => user0.uid, isOwner: async () => isOwner, canEdit: async () => isOwner, can: async () => true,
  profiles: async ids => {
    const out = {};
    await Promise.all([...new Set([].concat(ids))].map(async id => {
      if (!perfCache.has(id)) { try { const s = await F.getDoc(F.doc(fs, "perfis/" + id)); perfCache.set(id, s.exists() ? s.data() : null); } catch (_) { perfCache.set(id, null); } }
      const p = perfCache.get(id);
      out[id] = { id, name: p && p.nome || "", avatarUrl: p && p.foto || initials(p && p.nome, colorOf(id)), color: colorOf(id), email: null, isMe: id === user0.uid, guest: false };
    }));
    return out;
  }
};
const downloads = { save: async ({ filename, data }) => { const b = data instanceof Blob ? data : new Blob([data]); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return { status: "saved" }; } };
const assets = { upload: async file => { // imagem reduzida guardada junto do registro (sem custo de armazenamento)
  const img = await createImageBitmap(file); const s = Math.min(1, 720 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); const url = c.toDataURL("image/jpeg", 0.82);
  return { id: url, url, sizeBytes: url.length, contentType: "image/jpeg" }; } };

// ---------- notificações
let swReg = null;
if ("serviceWorker" in navigator) { try { swReg = await navigator.serviceWorker.register("firebase-messaging-sw.js"); } catch (_) {} }
const messaging = M && await M.isSupported().catch(() => false) ? M.getMessaging(app) : null;
async function salvarToken() {
  const token = await M.getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
  if (token) await F.setDoc(F.doc(fs, "tokens/" + token), { uid: user0.uid, email: (user0.email || "").toLowerCase(), nome: user0.displayName || "", aparelho: navigator.userAgent.slice(0, 180), criadoEm: new Date().toISOString() });
  return !!token;
}
if (messaging && typeof Notification !== "undefined" && Notification.permission === "granted") salvarToken().catch(() => {});
if (messaging) M.onMessage(messaging, p => { const n = p.notification || {}; if (swReg) swReg.showNotification(n.title || "Jay-Loma", { body: n.body || "", icon: "icons/icon-192.png", data: { link: "./" } }); });
window.JL = {
  pushStatus: () => !messaging ? "indisponivel" : (typeof Notification === "undefined" ? "indisponivel" : Notification.permission),
  enablePush: async () => { if (!messaging) return "indisponivel"; const p = await Notification.requestPermission(); if (p !== "granted") return p; try { await salvarToken(); return "granted"; } catch (_) { return "erro"; } },
  signOut: () => A.signOut(auth),
  isStandalone: () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true
};
window.__jlResolve({ use: async n => ({ db, user, downloads, assets }[n] || null) });
