// ─── DEVOLUÇÕES ───────────────────────────────────────────────────────────────
function renderDevolucoes(){
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Controle de Devoluções</div>
      <div class="row">
        <input id="dev-search" class="form-input" style="width:200px" placeholder="Buscar devolução..." oninput="filterDevolucoes()">
      </div>
    </div>
    <div style="margin-bottom:16px;padding:12px;background:var(--bg2);border-radius:8px;border:1px solid var(--border);font-size:13px;color:var(--muted)">
      Para registrar uma devolução, acesse <b style="color:var(--text)">Nota Fiscal</b>, encontre a NF emitida e clique em <b style="color:var(--amber)">Devolução</b>.
    </div>
    <div class="card" style="overflow-x:auto">
      <table class="table">
        <thead><tr><th>Número</th><th>Data</th><th>NF Origem</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Motivo</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody id="dev-tbody"></tbody>
      </table>
    </div>`;
  filterDevolucoes();
}
function filterDevolucoes(){
  const tbody=el("dev-tbody"); if(!tbody) return;
  const q=norm((el("dev-search")||{value:""}).value);
  const filtered=(state.returns||[]).filter(d=>{
    const c=getClient(d.clientId);
    return !q||norm(d.number).includes(q)||(d.nfNumber&&norm(d.nfNumber).includes(q))||(c&&norm(c.name).includes(q));
  }).sort((a,b)=>b.id-a.id);
  tbody.innerHTML=filtered.length?filtered.map(d=>{
    const c=getClient(d.clientId);
    return `<tr>
      <td><span class="badge">${d.number}</span></td>
      <td>${fmtDate(d.date)}</td>
      <td>${d.nfId?`<span class="badge" style="background:var(--bg2);cursor:pointer;text-decoration:underline" onclick="viewNF(${d.nfId})" title="Ver NF">${d.nfNumber||"—"}</span>`:`<span class="badge" style="background:var(--bg2)">${d.nfNumber||"—"}</span>`}</td>
      <td>${c?c.name:"—"}</td>
      <td>${d.items.length} item(s)</td>
      <td style="color:${d.status==="cancelada"?"var(--muted)":"var(--amber)"};${d.status==="cancelada"?"text-decoration:line-through":""}">${fmt(d.total)}</td>
      <td style="color:var(--muted);font-size:12px">${d.reason||"—"}</td>
      <td><span class="badge ${d.status==="cancelada"?"bg-gray":"bg-green"}">${d.status==="cancelada"?"cancelada":"ativa"}</span></td>
      <td>${d.status!=="cancelada"?`<button class="btn btn-ghost" style="padding:4px 8px;font-size:12px;color:var(--red)" onclick="cancelarDevolucao('${d.id}')">Cancelar</button>`:""}</td>
    </tr>`;}).join(""):`<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:32px">Nenhuma devolução registrada</td></tr>`;
}
async function cancelarDevolucao(id){
  const d=state.returns.find(x=>x.id==id);
  if(!d) return;
  if(d.status==="cancelada"){ alert("Esta devolução já está cancelada."); return; }
  if(!confirm("Cancelar devolução "+d.number+"? O estoque será revertido.")) return;
  const date=today();
  d.items.forEach(it=>{ const p=getProd(it.productId); if(p) p.stock=Math.max(0,p.stock-it.qty); });
  if(!state.stockMovements) state.stockMovements=[];
  d.items.forEach(it=>state.stockMovements.push({id:uid(),date,productId:it.productId,type:"saida",qty:it.qty,reason:"Cancelamento devolução",reference:d.number}));
  if(!state.transactions) state.transactions=[];
  state.transactions.push({id:uid(),date,type:"saida",category:"Devolução",description:`Estorno ${d.number} — NF ${d.nfNumber}`,amount:d.total});
  const nf=state.invoices.find(x=>x.id==d.nfId);
  if(nf&&nf.returnedTotal){ nf.returnedTotal=Math.max(0,parseFloat((nf.returnedTotal-d.total).toFixed(2))); }
  d.status="cancelada";
  await saveToFirebase();
  filterDevolucoes();
  showSyncStatus("✓ Devolução "+d.number+" cancelada");
}
function openDevolucaoModal(nfId){
  const nf=state.invoices.find(n=>n.id==nfId);
  if(!nf){ alert("NF não encontrada."); return; }
  if(nf.status==="cancelada"){ alert("Não é possível devolver uma NF cancelada."); return; }
  const c=getClient(nf.clientId);
  openModal(`<div class="modal-title">Registrar Devolução — ${nf.number}</div>
    <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">Cliente: <b style="color:var(--text)">${c?c.name:"—"}</b> &nbsp;|&nbsp; Data NF: <b style="color:var(--text)">${fmtDate(nf.date)}</b></div>
    <div class="form-group"><label class="form-label">Data da Devolução</label>
      <input id="dev-date" type="date" class="form-input" value="${today()}">
    </div>
    <div class="form-group"><label class="form-label">Motivo</label>
      <textarea id="dev-reason" class="form-input" rows="2" placeholder="Descreva o motivo da devolução..." style="resize:vertical"></textarea>
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">SELECIONE OS ITENS A DEVOLVER</div>
    <table class="table">
      <thead><tr><th><input type="checkbox" onchange="document.querySelectorAll('.dev-item-chk').forEach(c=>c.checked=this.checked)"></th><th>Produto</th><th>Qtd NF</th><th>Qtd Devolver</th></tr></thead>
      <tbody>${nf.items.map((it,i)=>{const p=getProd(it.productId);return `<tr>
        <td><input type="checkbox" class="dev-item-chk" data-idx="${i}" checked></td>
        <td>${p?p.name:it.productId}</td>
        <td>${it.qty} ${p?p.unit:""}</td>
        <td><input type="number" class="form-input dev-item-qty" data-idx="${i}" value="${it.qty}" min="1" max="${it.qty}" style="width:80px"></td>
      </tr>`;}).join("")}
      </tbody>
    </table>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarDevolucao('${nf.id}')">Registrar Devolução</button>
    </div>`);
}
async function salvarDevolucao(nfId){
  if(!_guardSave()) return;
  const nf=state.invoices.find(n=>n.id==nfId);
  if(!nf){ _doneSave(); return; }
  const chks=document.querySelectorAll(".dev-item-chk");
  const qtys=document.querySelectorAll(".dev-item-qty");
  const devItems=[];
  chks.forEach((chk,i)=>{
    if(chk.checked){
      const nfItem=nf.items[i];
      const qty=parseInt(qtys[i].value)||0;
      if(qty>0){
        const p=getProd(nfItem.productId);
        const unitPrice=nfItem.price*(1-(nfItem.itemDiscount||0)/100);
        devItems.push({productId:nfItem.productId,name:p?p.name:nfItem.productId,unit:p?p.unit:"",qty,unitPrice,total:qty*unitPrice});
      }
    }
  });
  if(!devItems.length){ _doneSave(); alert("Selecione ao menos um item para devolver."); return; }
  const reason=el("dev-reason").value.trim();
  const date=el("dev-date").value||today();
  const total=devItems.reduce((s,it)=>s+it.total,0);
  if(!state.returns) state.returns=[];
  const devNum="DEV-"+String(state.returns.length+1).padStart(4,"0");
  const dev={id:Date.now(),number:devNum,date,nfId:nf.id,nfNumber:nf.number,clientId:nf.clientId,items:devItems,reason,total};
  state.returns.push(dev);
  devItems.forEach(it=>{
    const p=getProd(it.productId);
    if(p) p.stock+=it.qty;
  });
  if(!state.stockMovements) state.stockMovements=[];
  devItems.forEach(it=>state.stockMovements.push({id:uid(),date,productId:it.productId,type:"entrada",qty:it.qty,reason:"Devolução",reference:devNum}));
  if(!state.transactions) state.transactions=[];
  state.transactions.push({id:Date.now()+2,date,type:"entrada",category:"Devolução",description:`Devolução ${devNum} — NF ${nf.number}`,amount:total});
  nf.returnedTotal=parseFloat(((nf.returnedTotal||0)+total).toFixed(2));
  let devRem=total;
  const openRecs=(state.receivables||[])
    .filter(r=>r.invoiceId===nf.id&&r.status==="aberta")
    .sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  for(const r of openRecs){
    if(devRem<=0.005) break;
    if(r.amount<=devRem+0.005){
      devRem=parseFloat((devRem-r.amount).toFixed(2));
      r.status="paga"; r.paidAt=date;
    } else {
      const saldo=parseFloat((r.amount-devRem).toFixed(2));
      r.amount=parseFloat(devRem.toFixed(2));
      r.status="paga"; r.paidAt=date;
      if(!state.receivables) state.receivables=[];
      state.receivables.push({...r,id:uid(),amount:saldo,paidAt:null,status:"aberta",isSaldo:true});
      devRem=0;
    }
  }
  const nfRecs=(state.receivables||[]).filter(x=>x.invoiceId===nf.id&&x.status!=="cancelada");
  const allDevPaid=nfRecs.length>0&&nfRecs.every(x=>x.status==="paga");
  const anyDevPaid=nfRecs.some(x=>x.status==="paga");
  if(nf.status!=="cancelada") nf.status=allDevPaid?"paga":anyDevPaid?"parcial":"emitida";
  try{
    await saveToFirebase();
    closeModal();
    showSyncStatus("✓ Devolução registrada, estoque restaurado");
    renderDevolucoes();
  }finally{ _doneSave(); }
}
