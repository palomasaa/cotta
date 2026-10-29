// Cota · motor de orçamento e agenda do personal chef (uma cozinheira)
// Usado pelo app (index.html) e pela página pública (pedido.html). Sem dependências.
(function(g){
"use strict";
// Parâmetros padrão (valores em centavos e minutos). Todos editáveis no app em Integrações e ajustes › Pedidos online.
const PADRAO={
  valorHora:7000,      // mão de obra da chef por hora trabalhada
  minHoras:3,          // mínimo cobrado por serviço em casa
  margem:20,           // % sobre mão de obra, transporte, gás e embalagens: impostos (DAS), reserva e imprevistos
  taxaCompra:10,       // % sobre ingredientes quando a chef compra: tempo de seleção, perdas e sobras
  transporte:4000,     // custo de ida e volta por serviço em casa (combustível/app)
  deslocamento:40,     // minutos de cada trajeto
  comprasBase:45, comprasPorPessoa:3,   // tempo de mercado
  servicoBase:30, servicoPorPessoa:3,   // empratar e servir no local
  limpezaBase:40, limpezaPorPessoa:2,   // deixar a cozinha do cliente limpa
  embalagemPorcao:135, embalagemMin:2,  // custo e tempo por porção embalada (pote, tampa, etiqueta)
  gasHora:400,         // gás e energia por hora de produção na cozinha da chef (encomendas)
  margemPrato:25,      // % sobre o custo total de cada prato pronto
  loteRef:8,           // porções de referência para calcular a mão de obra por porção pronta
  entrega:2000, entregaMin:40,          // taxa e tempo de entrega das encomendas
  pedidoMinimo:12000,  // valor mínimo de encomenda
  folga:20,            // % de folga sobre o tempo de trabalho (imprevistos, trânsito)
  intervalo:30,        // minutos livres obrigatórios entre dois compromissos
  jornadaIni:"07:00", jornadaFim:"23:59",
  horariosCasa:["12:00","12:30","13:00","19:00","19:30","20:00","20:30"],
  horariosEntrega:["11:00","12:00","16:00","17:00","18:00","19:00"],
  antecedencia:2, janela:180, dias:[0,1,2,3,4,5,6], bloqueios:[], sinalPct:50, maxPessoas:20
};
// Pratos que mantêm a qualidade depois de prontos e reaquecidos (podem ir como encomenda).
// Os demais só são servidos feitos na hora, no local.
const REAQUECE={lasanha:1,tiramisu:1,farofa_bacon:1,vinagrete:1,arroz:1,feijoada:1,brigadeiro_colher:1,moqueca:1,pirao:1,mousse_maracuja:1,creme_abobora:1,salada_quinoa:1,panna_cotta:1,salpicao:1,pernil:1,arroz_natal:1,pave:1,frango_grelhado:1,arroz_integral:1,feijao:1,legumes:1};
const MOTIVO_NA_HORA={carpaccio:"servido cru e fatiado na hora",risoto_cog:"risoto passa do ponto se esperar",file_vinho:"ponto da carne se perde ao reaquecer",petit:"precisa sair do forno na hora",bruschetta:"o pão amolece",caprese:"montada na hora com tomate fresco",picanha:"feita na brasa no local",linguica:"feita na brasa no local",pao_alho:"assado na hora",abacaxi:"grelhado na hora",couve:"escurece e amolece ao reaquecer",caipirinha:"preparada na hora",ceviche:"curado no limão minutos antes de servir",nhoque:"fica pesado ao reaquecer",ovos_mexidos:"só ficam cremosos na hora",panqueca:"perde a leveza",tabua:"montada na hora",suco_laranja:"perde vitamina e sabor",cafe:"coado na hora"};
// Equipamentos e itens que a chef leva para executar cada prato no local
const EQUIP_BASE=["Facas e chaira","Tábuas de corte","Panos de prato e avental","Potes para mise en place","Termômetro culinário","Luvas, toucas e sacos de lixo","Bolsa térmica e gelo"];
const EQUIP={carpaccio:["Mandolina ou faca de fatiar","Pratos frios"],risoto_cog:["Panela larga de fundo grosso","Concha"],file_vinho:["Frigideira pesada","Pinça"],petit:["Forminhas de petit gâteau","Forno pré-aquecido"],bruschetta:["Assadeira"],lasanha:["Refratário grande","Papel-alumínio"],tiramisu:["Travessa ou taças","Batedeira ou fouet"],picanha:["Churrasqueira e grelha","Faca de churrasco","Tábua grande"],linguica:["Espetos"],pao_alho:["Papel-alumínio"],farofa_bacon:["Frigideira grande"],feijoada:["Panela grande (12 L)","Panela de pressão"],ceviche:["Tigela inox","Bacia com gelo"],moqueca:["Panela de barro ou caçarola"],creme_abobora:["Mixer"],salada_quinoa:["Assadeira"],nhoque:["Espremedor de batata","Panela grande"],panna_cotta:["Taças","Geladeira (4 h antes)"],pernil:["Assadeira grande","Papel-alumínio"],pave:["Travessa"],panqueca:["Frigideira antiaderente"],tabua:["Tábua de servir"],cafe:["Coador e chaleira"],caipirinha:["Socador e copos"]};
const EQUIP_ENC=["Potes descartáveis com tampa","Etiquetas com data e validade","Caixa térmica para entrega","Sacolas"];

const hm=t=>{const [a,b]=String(t||"0:0").split(":").map(Number);return a*60+(b||0);};
const fmtMin=m=>{m=Math.round(m);const neg=m<0;m=Math.abs(m);const hh=Math.floor(m/60),mm=m%60;return (neg?"-":"")+(hh?hh+" h"+(mm?" "+String(mm).padStart(2,"0"):""):mm+" min");};
const fmtHora=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");};
const fator=p=>0.7+0.075*Math.max(1,p); // tempo cresce com as porções, mas não linearmente
// Tempo de cozinha: só a parte ativa cresce com as porções; cozimento longo (forno, panela) corre em paralelo
const ativoDe=t=>t>=60?t*0.4:t*0.8;
function tempoCozinha(ids,R,qtd){if(!ids.length)return 0;let soma=0,maior=0;ids.forEach(id=>{const t=(R[id].t||20),q=qtd(id),at=ativoDe(t)*fator(q);soma+=at;maior=Math.max(maior,t-ativoDe(t)+at);});return Math.round(Math.max(soma,maior)+10);}
const up5=c=>Math.ceil(c/500)*500;     // arredonda para cima em R$ 5
const up50c=c=>Math.ceil(c/50)*50;     // arredonda para cima em R$ 0,50
function cfgDe(c){const o=Object.assign({},PADRAO,c||{});["horariosCasa","horariosEntrega","dias","bloqueios"].forEach(k=>{if(!Array.isArray(o[k]))o[k]=PADRAO[k];});return o;}
function reaquece(id,rec){if(rec&&rec.reaquece!=null)return !!rec.reaquece;return !!REAQUECE[id];}
// rec: {id:{n,tipo,t}}; custo(id,p) → centavos dos ingredientes para p porções
function precoPorcao(id,R,custo,C){
  C=cfgDe(C);const r=R[id];if(!r)return 0;const L=C.loteRef;
  const ing=custo(id,L)/L;const tempo=ativoDe(r.t||20)*fator(L)/L;
  const mao=tempo/60*C.valorHora;const gas=tempo/60*C.gasHora;
  return up50c((ing+C.embalagemPorcao+mao+gas)*(1+C.margemPrato/100));
}
// pedido: {tipo:'casa'|'casa_cliente'|'encomenda', receitas:[ids] (em casa), itens:{id:porções} (encomenda), pessoas}
function calcular(ped,R,custo,C){
  C=cfgDe(C);const tipo=ped.tipo||"casa";const p=Math.max(1,ped.pessoas||1);
  const T={},K={},avisos=[];
  if(tipo==="encomenda"){
    const it=Object.entries(ped.itens||{}).filter(([id,q])=>q>0&&R[id]);
    let porc=0,ing=0,pratos=0;const linhasPr=[];
    it.forEach(([id,q])=>{const r=R[id];if(!reaquece(id,r))avisos.push(r.n+" não vai bem como encomenda ("+(MOTIVO_NA_HORA[id]||"melhor feito na hora")+").");
      porc+=q;ing+=custo(id,q);const pp=precoPorcao(id,R,custo,C);pratos+=pp*q;linhasPr.push({id,n:r.n,q,pp,sub:pp*q});});
    T.preparo=tempoCozinha(it.map(x=>x[0]),R,id=>ped.itens[id]);T.embalagem=Math.round(porc*C.embalagemMin);T.ida=C.entregaMin;T.volta=C.entregaMin;
    T.trabalho=T.preparo+T.embalagem+T.ida+T.volta;T.folga=Math.round(T.trabalho*C.folga/100);T.total=T.trabalho+T.folga;
    K.ingredientes=ing;K.embalagens=porc*C.embalagemPorcao;K.gas=Math.round(T.preparo/60*C.gasHora);K.maoObra=Math.round((T.preparo+T.embalagem)/60*C.valorHora);
    K.entrega=C.entrega;const custoTotal=K.ingredientes+K.embalagens+K.gas+K.maoObra;
    let total=pratos+C.entrega;if(pratos&&pratos<C.pedidoMinimo){avisos.push("Pedido mínimo de encomenda: "+(C.pedidoMinimo/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+".");}
    // na agenda: produção e embalagem antes do horário de entrega; volta depois
    const antes=T.preparo+T.embalagem+T.ida+Math.round(T.folga*0.7),depois=15+T.volta+Math.round(T.folga*0.3);
    return {tipo,T,K,pratos:linhasPr,porcoes:porc,total,lucroEstimado:total-custoTotal-K.entrega,ini:-antes,fim:depois,avisos,
      linhas:[["Pratos prontos ("+porc+" porções)",pratos],["Entrega",C.entrega]]};
  }
  const ids=(ped.receitas||[]).filter(id=>R[id]);
  T.compras=tipo==="casa"?C.comprasBase+C.comprasPorPessoa*p:0;
  T.ida=C.deslocamento;T.volta=C.deslocamento;
  T.preparo=tempoCozinha(ids,R,()=>p);
  T.servico=C.servicoBase+C.servicoPorPessoa*p;T.limpeza=C.limpezaBase+C.limpezaPorPessoa*p;
  T.trabalho=T.compras+T.ida+T.preparo+T.servico+T.limpeza+T.volta;T.folga=Math.round(T.trabalho*C.folga/100);T.total=T.trabalho+T.folga;
  K.ingredientes=tipo==="casa"?ids.reduce((s,id)=>s+custo(id,p),0):0;
  K.taxaCompra=Math.round(K.ingredientes*C.taxaCompra/100);
  K.transporte=C.transporte;
  K.maoObra=Math.round(Math.max(T.trabalho/60,C.minHoras)*C.valorHora);
  K.margem=Math.round((K.maoObra+K.transporte)*C.margem/100);
  const total=up5(K.ingredientes+K.taxaCompra+K.transporte+K.maoObra+K.margem);
  K.arredondamento=total-(K.ingredientes+K.taxaCompra+K.transporte+K.maoObra+K.margem);
  // na agenda: compras, ida e preparo antes do horário; serviço, limpeza e volta depois
  const antes=T.compras+T.ida+T.preparo+Math.round(T.folga/2),depois=T.servico+T.limpeza+T.volta+Math.round(T.folga/2);
  const horas=Math.max(T.trabalho/60,C.minHoras);
  if(T.trabalho>600)avisos.push("Serviço longo ("+fmtMin(T.trabalho)+"): considere adiantar parte do preparo na cozinha da chef no dia anterior.");
  if(ids.some(id=>(R[id].t||0)>=180))avisos.push("Há prato de cozimento longo: o ideal é pré-preparar na véspera.");
  const linhas=tipo==="casa"?[["Ingredientes",K.ingredientes],["Compras e seleção ("+C.taxaCompra+"%)",K.taxaCompra],["Serviço da chef ("+horas.toLocaleString("pt-BR",{maximumFractionDigits:1})+" h)",K.maoObra],["Deslocamento",K.transporte],["Encargos e reserva ("+C.margem+"%)",K.margem+K.arredondamento]]
    :[["Serviço da chef ("+horas.toLocaleString("pt-BR",{maximumFractionDigits:1})+" h)",K.maoObra],["Deslocamento",K.transporte],["Encargos e reserva ("+C.margem+"%)",K.margem+K.arredondamento]];
  return {tipo,T,K,total,porPessoa:Math.round(total/p),lucroEstimado:K.margem+K.arredondamento,ini:-antes,fim:depois,avisos,linhas};
}
// Cronograma do dia a partir do horário de servir/entregar
function cronograma(calc,hora){
  const H=hm(hora),T=calc.T,out=[];let t=H+calc.ini;
  if(calc.tipo==="encomenda"){out.push([t,"Início da produção ("+fmtMin(T.preparo)+")"]);t+=T.preparo;out.push([t,"Embalar e etiquetar ("+fmtMin(T.embalagem)+")"]);t+=T.embalagem;out.push([H-T.ida,"Sair para a entrega"]);out.push([H,"Entrega ao cliente"]);out.push([H+15+T.volta,"Fim (volta da entrega)"]);return out;}
  if(T.compras){out.push([t,"Mercado e compras ("+fmtMin(T.compras)+")"]);t+=T.compras;}
  out.push([H-T.preparo-T.ida,"Sair para o local"]);out.push([H-T.preparo,"Chegada e preparo ("+fmtMin(T.preparo)+")"]);
  out.push([H,"Servir"]);out.push([H+T.servico,"Limpeza da cozinha ("+fmtMin(T.limpeza)+")"]);out.push([H+T.servico+T.limpeza+T.volta,"Fim (de volta em casa)"]);
  return out;
}
// ocupados: [{ini,fim}] em minutos do dia (já com folga). Retorna os horários possíveis sem choque, dentro da jornada.
function horariosLivres(lista,ocupados,calc,C){
  C=cfgDe(C);const ji=hm(C.jornadaIni),jf=hm(C.jornadaFim),iv=C.intervalo;
  return lista.filter(hh=>{const a=hm(hh)+calc.ini,b=hm(hh)+calc.fim;if(a<ji||b>jf)return false;return !(ocupados||[]).some(o=>a<o.fim+iv&&b>o.ini-iv);});
}
function equipamentos(ped){const ids=ped.tipo==="encomenda"?Object.keys(ped.itens||{}).filter(k=>ped.itens[k]>0):(ped.receitas||[]);
  if(ped.tipo==="encomenda")return [...EQUIP_ENC,"Panelas e assadeiras da produção"];
  const s=new Set(EQUIP_BASE);ids.forEach(id=>(EQUIP[id]||[]).forEach(x=>s.add(x)));return [...s];}
g.CotaOrc={PADRAO,REAQUECE,MOTIVO_NA_HORA,cfgDe,reaquece,precoPorcao,calcular,cronograma,horariosLivres,equipamentos,hm,fmtMin,fmtHora};
})(typeof window!=="undefined"?window:globalThis);
