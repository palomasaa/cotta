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
// Privacidade: a notificação aparece na tela bloqueada e o log do GitHub é público,
// então só contamos os tipos de aviso. Nomes de clientes e valores ficam dentro do app.
const tipos = {};
const marca = t => { tipos[t] = (tipos[t] || 0) + 1; };
for (const p of await todos("pedidos")) {
  if (p.status === "cancelado" || p.status === "realizado") continue;
  if (p.data === hoje || p.data === amanha) marca("pedido");
  if (p.data === hoje) linhas.push(`Hoje${p.hora ? " às " + p.hora : ""}: pedido de ${p.cliente}`);
  else if (p.data === amanha) linhas.push(`Amanhã${p.hora ? " às " + p.hora : ""}: pedido de ${p.cliente}`);
  if (p.status === "confirmado" && p.data && p.data < hoje && (p.valor || 0) > (p.sinal || 0)) { linhas.push(`Falta receber ${brl(p.valor - p.sinal)} de ${p.cliente}`); marca("receber"); }
}
const baixos = (await todos("estoque")).filter(i => i.empresa === "chef" && i.minimo > 0 && i.qtd <= i.minimo).map(i => i.nome);
if (baixos.length) marca("estoque");
if (baixos.length) linhas.push(`Estoque baixo: ${baixos.slice(0, 4).join(", ")}${baixos.length > 4 ? " e mais " + (baixos.length - 4) : ""}`);
for (const a of await todos("anuncios")) {
  if (a.status !== "ativo") continue;
  if (a.fim && a.fim >= hoje && a.fim <= em3) { linhas.push(`Anúncio "${a.nome}" termina em ${dm(a.fim)}`); marca("anuncio"); }
  if (a.orcamento > 0 && a.gasto >= a.orcamento) { linhas.push(`Anúncio "${a.nome}" passou do orçamento`); marca("anuncio"); }
}
for (const e of await todos("eventos")) if (e.data === hoje) { linhas.push(`Hoje${e.hora ? " às " + e.hora : ""}: ${e.titulo}`); marca("agenda"); }
let saldo = 0;
for (const a of await todos("acertos")) {
  if (a.tipo === "despesa") saldo += a.pagoPor === "Paloma" ? Math.round(a.valor * (100 - a.pctP) / 100) : -Math.round(a.valor * a.pctP / 100);
  else saldo += a.de === "Jay Nanes" ? -a.valor : a.valor;
}
if (saldo !== 0 && new Date().getDay() === 1) marca("acerto");
if (saldo !== 0 && new Date().getDay() === 1) linhas.push(saldo > 0 ? `Acerto: Jay deve ${brl(saldo)} à Paloma` : `Acerto: Paloma deve ${brl(-saldo)} à Jay`);

if (!linhas.length && !teste) { console.log("Nada para avisar hoje."); process.exit(0); }
const NOMES_T = { pedido: ["pedido", "pedidos"], receber: ["valor a receber", "valores a receber"], estoque: ["item para repor", "itens para repor"], anuncio: ["aviso de anúncio", "avisos de anúncio"], agenda: ["compromisso", "compromissos"], acerto: ["acerto entre sócias", "acerto entre sócias"] };
const resumo = Object.entries(tipos).map(([t, n]) => t === "estoque" || t === "acerto" ? NOMES_T[t][0] : n + " " + NOMES_T[t][n === 1 ? 0 : 1]);
const title = linhas.length ? `Cota · ${linhas.length} ${linhas.length === 1 ? "alerta" : "alertas"} hoje` : "Cota · teste de alerta";
const body = linhas.length ? resumo.join(" · ") + ". Abra o app para ver os detalhes." : "Os alertas estão funcionando neste aparelho.";

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
console.log("Tipos de aviso:", Object.keys(tipos).join(", ") || "nenhum");
