// ─── CONTAS ──────────────────────────────────────────────────────────────────
function renderContas(){
  const tab=state.contasTab||"receber";
  const recAbertas=state.receivables.filter(r=>r.status==="aberta");
  const payAbertas=state.payables.filter(p=>p.status==="aberta");
  const totalRec=recAbertas.reduce((s,r)=>s+r.amount,0);
  const totalPay=payAbertas.reduce((s,p)=>s+p.amount,0);
  const overdueRec=recAbertas.filter(r=>isOverdue(r.dueDate));
  const overduePay=payAbertas.filter(p=>isOverdue(p.dueDate));
  const fOverdue=(el("contas-f-overdue")||{}).checked||false;
  let tableHTML="";
  if(tab==="receber"){
    let sorted=[...state.receivables].sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
    if(fOverdue) sorted=sorted.filter(r=>isOverdue(r.dueDate)&&r.status==="aberta");
    tableHTML=`
      <table><thead><tr><th>Nota</th><th>Parcela</th><th>Cliente</th><th>Vencimento</th><th>Valor</th><th>Status</th><th></th></tr></thead><tbody>
        ${sorted.map(r=>{const c=getClient(r.clientId);const overdue=isOverdue(r.dueDate)&&r.status==="aberta";return`<tr>
          <td class="mono text-amber">${r.invoiceNumber}</td>
          <td class="mono">${r.installment}/${r.total}${r.isSaldo?` <span class="badge bg-amber" style="font-size:10px">saldo</span>`:""}</td>
          <td class="text-white">${c?c.name:"—"}</td>
          <td class="mono ${overdue?"text-red":""}">${fmtDate(r.dueDate)}${overdue?" ⚠":""}</td>
          <td class="mono fw-bold">${fmt(r.amount)}</td>
          <td><span class="badge ${r.status==="paga"?"bg-green":r.status==="cancelada"?"bg-gray":overdue?"bg-red":"bg-amber"}">${r.status==="aberta"&&overdue?"vencida":r.status}</span></td>
          <td>${r.status==="aberta"?`<button class="btn-sm btn-green" onclick="payReceivable(${r.id})">Receber</button>`:`<span class="text-muted mono" style="font-size:11px">${r.paidAt?fmtDate(r.paidAt):""}</span>`}</td>
        </tr>`}).join("")||`<tr><td colspan="7" class="empty">Nenhum lançamento.</td></tr>`}
      </tbody></table>`;
  } else {
    let sorted=[...state.payables].sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
    if(fOverdue) sorted=sorted.filter(p=>isOverdue(p.dueDate)&&p.status==="aberta");
    tableHTML=`
      <table><thead><tr><th>Compra</th><th>Parcela</th><th>Fornecedor</th><th>Vencimento</th><th>Valor</th><th>Status</th><th></th></tr></thead><tbody>
        ${sorted.map(p=>{const s=getSupplier(p.supplierId);const overdue=isOverdue(p.dueDate)&&p.status==="aberta";return`<tr>
          <td class="mono text-amber">${p.purchaseNumber||p.description}</td>
          <td class="mono">${p.installment}/${p.total}${p.isSaldo?` <span class="badge bg-amber" style="font-size:10px">saldo</span>`:""}</td>
          <td class="text-white">${s?s.name:"—"}</td>
          <td class="mono ${overdue?"text-red":""}">${fmtDate(p.dueDate)}${overdue?" ⚠":""}</td>
          <td class="mono fw-bold">${fmt(p.amount)}</td>
          <td><span class="badge ${p.status==="paga"?"bg-green":overdue?"bg-red":"bg-amber"}">${p.status==="aberta"&&overdue?"vencida":p.status}</span></td>
          <td>${p.status==="aberta"?`<button class="btn-sm btn-red" onclick="payPayable(${p.id})">Pagar</button>`:`<span class="text-muted mono" style="font-size:11px">${p.paidAt?fmtDate(p.paidAt):""}</span>`}</td>
        </tr>`}).join("")||`<tr><td colspan="7" class="empty">Nenhum lançamento.</td></tr>`}
      </tbody></table>`;
  }
  el("content").innerHTML=`
    <div class="kpi-grid-2" style="margin-bottom:20px">
      <div class="kpi"><div class="kpi-label">A Receber (em aberto)</div>
        <div class="kpi-value text-green">${fmt(totalRec)}</div>
        <div class="kpi-sub">${recAbertas.length} parcelas · ${overdueRec.length} vencida(s)</div>
      </div>
      <div class="kpi"><div class="kpi-label">A Pagar (em aberto)</div>
        <div class="kpi-value text-red">${fmt(totalPay)}</div>
        <div class="kpi-sub">${payAbertas.length} parcelas · ${overduePay.length} vencida(s)</div>
      </div>
    </div>
    <div class="row-between" style="margin-bottom:12px">
      <div class="tabs" style="margin-bottom:0;border-bottom:none">
        <div class="tab ${tab==="receber"?"active":""}" onclick="state.contasTab='receber';renderContas()">A Receber (${recAbertas.length})</div>
        <div class="tab ${tab==="pagar"?"active":""}" onclick="state.contasTab='pagar';renderContas()">A Pagar (${payAbertas.length})</div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);cursor:pointer">
        <input type="checkbox" id="contas-f-overdue" onchange="renderContas()" ${fOverdue?"checked":""}> Só vencidas
      </label>
    </div>
    <div class="card">${tableHTML}</div>`;
}
function payReceivable(id){
  const r=state.receivables.find(x=>x.id===id);
  if(!r||r.status!=="aberta") return;
  const c=getClient(r.clientId);
  const overdue=isOverdue(r.dueDate);
  showModal(`<div class="modal-title">Registrar Recebimento</div>
    <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">
      Cliente: <b style="color:var(--text)">${c?c.name:"—"}</b> &nbsp;|&nbsp;
      NF: <b style="color:var(--amber)">${r.invoiceNumber}</b> &nbsp;|&nbsp;
      Parcela: <b>${r.installment}/${r.total}</b>
    </div>
    ${overdue?`<div class="alert-red">⚠ Parcela vencida desde ${fmtDate(r.dueDate)}</div>`:""}
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Data de Recebimento</label>
        <input id="pr-date" type="date" class="form-input" value="${today()}">
      </div>
      <div class="form-group"><label class="form-label">Valor a Receber (R$) <span class="text-muted" style="font-size:10px">— reduza para pagamento parcial</span></label>
        <input id="pr-amt" type="number" step="0.01" min="0.01" class="form-input" value="${r.amount}">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" style="background:var(--green)" onclick="confirmarPayReceivable(${id})">✓ Confirmar Recebimento</button>
    </div>`);
}
async function confirmarPayReceivable(id){
  if(!_guardSave()) return;
  const r=state.receivables.find(x=>x.id===id);
  if(!r||r.status!=="aberta"){ _doneSave(); return; }
  const payDate=el("pr-date").value||today();
  const amt=parseFloat(el("pr-amt").value)||r.amount;
  if(amt<r.amount-0.01){
    const remainder=parseFloat((r.amount-amt).toFixed(2));
    state.receivables.push({...r,id:uid(),amount:remainder,paidAt:null,status:"aberta",installment:r.total+1,total:r.total+1,isSaldo:true});
    r.amount=parseFloat(amt.toFixed(2));
  }
  r.status="paga"; r.paidAt=payDate;
  state.transactions.push({id:uid(),date:payDate,type:"entrada",category:"Vendas",description:`Recebimento ${r.installment}/${r.total} ${r.invoiceNumber}`,amount:parseFloat(amt.toFixed(2))});
  const nfRecs=state.receivables.filter(x=>x.invoiceId===r.invoiceId&&x.status!=="cancelada");
  const allPaid=nfRecs.every(x=>x.status==="paga");
  const anyPaid=nfRecs.some(x=>x.status==="paga");
  const nf=state.invoices.find(x=>x.id===r.invoiceId);
  if(nf) nf.status=allPaid?"paga":anyPaid?"parcial":"emitida";
  try{ await saveToFirebase(); closeModal(); renderContas(); showSyncStatus(`✓ Recebimento de ${fmt(parseFloat(amt.toFixed(2)))} registrado`); }
  finally{ _doneSave(); }
}
function payPayable(id){
  const p=state.payables.find(x=>x.id===id);
  if(!p||p.status!=="aberta") return;
  const s=getSupplier(p.supplierId);
  const overdue=isOverdue(p.dueDate);
  showModal(`<div class="modal-title">Registrar Pagamento</div>
    <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">
      Fornecedor: <b style="color:var(--text)">${s?s.name:"—"}</b> &nbsp;|&nbsp;
      Compra: <b style="color:var(--amber)">${p.purchaseNumber||p.description}</b> &nbsp;|&nbsp;
      Parcela: <b>${p.installment}/${p.total}</b>
    </div>
    ${overdue?`<div class="alert-red">⚠ Parcela vencida desde ${fmtDate(p.dueDate)}</div>`:""}
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Data de Pagamento</label>
        <input id="pp-date" type="date" class="form-input" value="${today()}">
      </div>
      <div class="form-group"><label class="form-label">Valor a Pagar (R$) <span class="text-muted" style="font-size:10px">— reduza para pagamento parcial</span></label>
        <input id="pp-amt" type="number" step="0.01" min="0.01" class="form-input" value="${p.amount}">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" style="background:var(--green)" onclick="confirmarPayPayable(${id})">✓ Confirmar Pagamento</button>
    </div>`);
}
async function confirmarPayPayable(id){
  if(!_guardSave()) return;
  const p=state.payables.find(x=>x.id===id);
  if(!p||p.status!=="aberta"){ _doneSave(); return; }
  const payDate=el("pp-date").value||today();
  const amt=parseFloat(el("pp-amt").value)||p.amount;
  if(amt<p.amount-0.01){
    const remainder=parseFloat((p.amount-amt).toFixed(2));
    state.payables.push({...p,id:uid(),amount:remainder,paidAt:null,status:"aberta",installment:p.total+1,total:p.total+1,isSaldo:true});
    p.amount=parseFloat(amt.toFixed(2));
  }
  p.status="paga"; p.paidAt=payDate;
  const sup=getSupplier(p.supplierId);
  state.transactions.push({id:uid(),date:payDate,type:"saida",category:"Compras",description:`Pagamento ${p.installment}/${p.total} ${p.purchaseNumber||p.description}${sup?" — "+sup.name:""}`,amount:parseFloat(amt.toFixed(2))});
  const compraId=p.purchaseId;
  const allPays=state.payables.filter(x=>x.purchaseId==compraId&&x.status!=="cancelada");
  const allPaid=allPays.every(x=>x.status==="paga");
  const anyPaid=allPays.some(x=>x.status==="paga");
  const compra=state.purchases.find(x=>x.id==compraId);
  if(compra) compra.status=allPaid?"paga":anyPaid?"parcial":"a pagar";
  try{ await saveToFirebase(); closeModal(); renderContas(); showSyncStatus(`✓ Pagamento de ${fmt(parseFloat(amt.toFixed(2)))} registrado`); }
  finally{ _doneSave(); }
}
