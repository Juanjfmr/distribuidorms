// ─── STATE ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "distribuidorms_v2";
const defaultState = {
  company:{ name:"2R Comércio", cnpj:"", address:"", city:"", uf:"MS", phone:"", email:"" },
  products:[], clients:[], suppliers:[],
  invoices:[], purchases:[],
  receivables:[], payables:[], transactions:[],
  stockMovements:[],
  currentView:"dashboard", contasTab:"receber", cashFilter:"todos",
  nfItems:[], compraItems:[], pedidoItems:[], nfCosts:[], relPeriod:"all", relTab:"geral",
  orders:[], returns:[],
};

let state = {};

function loadState(){
  try{
    const s = localStorage.getItem(STORAGE_KEY);
    if(s){ state = JSON.parse(s); }
    else{ state = JSON.parse(JSON.stringify(defaultState)); }
    if(!state.stockMovements) state.stockMovements=[];
    if(!state.suppliers) state.suppliers=[];
    if(!state.purchases) state.purchases=[];
    if(!state.receivables) state.receivables=[];
    if(!state.payables) state.payables=[];
    if(!state.company) state.company=defaultState.company;
    if(!state.orders) state.orders=[];
    if(!state.returns) state.returns=[];
    state.nfItems=[]; state.compraItems=[]; state.pedidoItems=[]; state.nfCosts=[];
  }catch(e){ state = JSON.parse(JSON.stringify(defaultState)); }
}
function saveState(){
  const toSave = Object.assign({},state);
  delete toSave.nfItems; delete toSave.compraItems; delete toSave.pedidoItems; delete toSave.nfCosts;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(toSave));
  saveToFirebase();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtNum = v => (v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate = d => { if(!d) return "—"; const [y,m,dd]=d.split("-"); return `${dd}/${m}/${y}`; };
const today = () => new Date().toISOString().slice(0,10);
const addDays = (ds,n) => { const d=new Date(ds+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const uid = () => Date.now()+Math.floor(Math.random()*9999);
const getProd = id => state.products.find(p=>p.id===id);
const getClient = id => state.clients.find(c=>c.id===id);
const getSupplier = id => state.suppliers.find(s=>s.id===id);
const el = id => document.getElementById(id);
const totalIn = (txs) => (txs||state.transactions).filter(t=>t.type==="entrada").reduce((s,t)=>s+t.amount,0);
const totalOut = (txs) => (txs||state.transactions).filter(t=>t.type==="saida").reduce((s,t)=>s+t.amount,0);
const isOverdue = dueDate => dueDate < today();
const norm = s => (s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const normWords = s => norm(s).replace(/\s+/g,'');
function prodSimilarity(a,b){
  if(norm(a)===norm(b)) return 1;
  if(normWords(a)===normWords(b)) return 0.95;
  const wa=norm(a).split(/\s+/).sort().join(' '), wb=norm(b).split(/\s+/).sort().join(' ');
  if(wa===wb) return 0.9;
  return 0;
}
let _saving = false;
function _guardSave(){ if(_saving) return false; _saving=true; return true; }
function _doneSave(){ _saving=false; }
const CAT_PROD=["Bebidas","Alimentos","Limpeza","Higiene","Outros"];
const UNITS=["UN","CX","DZ","PCT","KG","LT","MT","FD"];
const PAY_TERMS=["À Vista","7 dias","14 dias","21 dias","28 dias","30 dias","35 dias","42 dias","30/60","30/60/90"];
const CAT_FIN={entrada:["Vendas","Outros","Financiamento","Juros"],saida:["Compras","Logística","Operacional","Salários","Impostos","Outros"]};

function generateReceivables(invoiceId,invoiceNumber,clientId,total,date,terms){
  const recs=[];
  let dates=[], shares=[];
  if(terms==="À Vista"){ dates=[date]; shares=[1]; }
  else if(terms==="7 dias"){ dates=[addDays(date,7)]; shares=[1]; }
  else if(terms==="14 dias"){ dates=[addDays(date,14)]; shares=[1]; }
  else if(terms==="21 dias"){ dates=[addDays(date,21)]; shares=[1]; }
  else if(terms==="28 dias"){ dates=[addDays(date,28)]; shares=[1]; }
  else if(terms==="30 dias"){ dates=[addDays(date,30)]; shares=[1]; }
  else if(terms==="30/60"){ dates=[addDays(date,30),addDays(date,60)]; shares=[0.5,0.5]; }
  else if(terms==="30/60/90"){ dates=[addDays(date,30),addDays(date,60),addDays(date,90)]; shares=[1/3,1/3,1/3]; }
  else{ const m=terms.match(/^(\d+)\s*dias?$/i); if(m){ dates=[addDays(date,parseInt(m[1]))]; shares=[1]; } else{ dates=[date]; shares=[1]; } }
  dates.forEach((d,i)=>{
    recs.push({id:uid()+(i*7),invoiceId,invoiceNumber,clientId,dueDate:d,amount:parseFloat((total*shares[i]).toFixed(2)),installment:i+1,total:dates.length,status:"aberta",paidAt:null});
  });
  return recs;
}

function generatePayables(purchaseId,purchaseNumber,supplierId,total,date,terms,description){
  const pays=[];
  let dates=[], shares=[];
  if(!terms||terms==="À Vista"){ dates=[date]; shares=[1]; }
  else if(terms==="30"){ dates=[addDays(date,30)]; shares=[1]; }
  else if(terms==="30/60"){ dates=[addDays(date,30),addDays(date,60)]; shares=[0.5,0.5]; }
  else if(terms==="30/60/90"){ dates=[addDays(date,30),addDays(date,60),addDays(date,90)]; shares=[1/3,1/3,1/3]; }
  else{ dates=[addDays(date,30)]; shares=[1]; }
  dates.forEach((d,i)=>{
    pays.push({id:uid()+(i*7),purchaseId,purchaseNumber,supplierId,dueDate:d,amount:parseFloat((total*shares[i]).toFixed(2)),installment:i+1,total:dates.length,status:"aberta",paidAt:null,description:description||purchaseNumber});
  });
  return pays;
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function showModal(html,large){
  el("modal-box").className="modal-box"+(large?" modal-box-lg":"");
  el("modal-box").innerHTML=html;
  el("modal").style.display="flex";
}
function closeModal(){ el("modal").style.display="none"; state.nfItems=[]; state.compraItems=[]; state.pedidoItems=[]; state.nfCosts=[]; }
const openModal = showModal;
