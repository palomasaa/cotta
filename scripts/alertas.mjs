// Envia os alertas do dia para os celulares (roda no GitHub Actions todo dia às 8h de Brasília)
import admin from "firebase-admin";

const APP_URL = "https://palomasaa.github.io/jay-loma/";
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (!sa.project_id) { console.error("Falta o segredo FIREBASE_SERVICE_ACCOUNT no GitHub."); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const teste = process.env.TESTE === "true";

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const hoje = fmt.format(new Date());
const somaDias = (s, n) => { const [y, m, d] = s.split("-").map(Number); return fmt.format(new Date(Date.UTC(y, m - 1, d + n, 12))); };
const amanha = somaDias(hoje, 1), em3 = somaDias(hoje, 3);
const brl = c => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dm = s => s.slice(8, 10) + "/" + s.slice(5, 7);
const todos = async c => (await db.collection(c).get()).docs.map(d => d.data());

const linhas = [];
for (const p of await todos("pedidos")) {
  if (p.status === "cancelado" || p.status === "realizado") continue;
  if (p.data === hoje) linhas.push(`Hoje${p.hora ? " às " + p.hora : ""}: pedido de ${p.cliente}`);
  else if (p.data === amanha) linhas.push(`Amanhã${p.hora ? " às " + p.hora : ""}: pedido de ${p.cliente}`);
  if (p.status === "confirmado" && p.data && p.data < hoje && (p.valor || 0) > (p.sinal || 0)) linhas.push(`Falta receber ${brl(p.valor - p.sinal)} de ${p.cliente}`);
}
const baixos = (await todos("estoque")).filter(i => i.empresa === "chef" && i.minimo > 0 && i.qtd <= i.minimo).map(i => i.nome);
if (baixos.length) linhas.push(`Estoque baixo: ${baixos.slice(0, 4).join(", ")}${baixos.length > 4 ? " e mais " + (baixos.length - 4) : ""}`);
for (const a of await todos("anuncios")) {
  if (a.status !== "ativo") continue;
  if (a.fim && a.fim >= hoje && a.fim <= em3) linhas.push(`Anúncio "${a.nome}" termina em ${dm(a.fim)}`);
  if (a.orcamento > 0 && a.gasto >= a.orcamento) linhas.push(`Anúncio "${a.nome}" passou do orçamento`);
}
for (const e of await todos("eventos")) if (e.data === hoje) linhas.push(`Hoje${e.hora ? " às " + e.hora : ""}: ${e.titulo}`);
let saldo = 0;
for (const a of await todos("acertos")) {
  if (a.tipo === "despesa") saldo += a.pagoPor === "Paloma" ? Math.round(a.valor * (100 - a.pctP) / 100) : -Math.round(a.valor * a.pctP / 100);
  else saldo += a.de === "Jay Nanes" ? -a.valor : a.valor;
}
if (saldo !== 0 && new Date().getDay() === 1) linhas.push(saldo > 0 ? `Acerto: Jay deve ${brl(saldo)} à Paloma` : `Acerto: Paloma deve ${brl(-saldo)} à Jay`);

if (!linhas.length && !teste) { console.log("Nada para avisar hoje."); process.exit(0); }
const title = linhas.length ? `Jay-Loma · ${linhas.length} ${linhas.length === 1 ? "aviso" : "avisos"} hoje` : "Jay-Loma · teste de alerta";
const body = linhas.length ? linhas.slice(0, 5).join("\n") : "Os alertas estão funcionando neste aparelho.";

const tokSnap = await db.collection("tokens").get();
const tokens = tokSnap.docs.map(d => d.id);
if (!tokens.length) { console.log("Nenhum aparelho com alertas ativos."); process.exit(0); }
const res = await admin.messaging().sendEachForMulticast({
  tokens,
  webpush: { notification: { title, body, icon: APP_URL + "icons/icon-192.png", badge: APP_URL + "icons/icon-192.png" }, fcmOptions: { link: APP_URL } }
});
let removidos = 0;
await Promise.all(res.responses.map(async (r, i) => {
  const c = r.error && r.error.code;
  if (c === "messaging/registration-token-not-registered" || c === "messaging/invalid-registration-token" || c === "messaging/invalid-argument") { await db.doc("tokens/" + tokens[i]).delete(); removidos++; }
}));
console.log(`Enviado: ${res.successCount} ok, ${res.failureCount} falhas, ${removidos} aparelhos antigos removidos.`);
console.log(body);
