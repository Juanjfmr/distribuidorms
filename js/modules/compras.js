// ─── COMPRAS ─────────────────────────────────────────────────────────────────
const CP_PAY_METHODS=["Pix","Cartão de Crédito","Crédito Fornecedor","Dinheiro","Transferência"];

function renderCompras(){
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Ordens de Compra</div>
      <div class="row">
        <input id="comp-search" class="form-input" style="width:200px" placeholder="Buscar compra/fornecedor..." oninput="filterCompras()">
        <button class="btn btn-primary" onclick="openCompraModal()">+ Nova Compra</button>
      </div>
    </div>
    <div class="card" style="overflow-x:auto"><table><thead><tr>
      <th>Número</th><th>Data</th><th>Fornecedor</th><th>Frete</th><th>Total</th><th>Forma Pag.</th><th>Vencimento</th><th>Status</th><th></th>
    </tr></thead><tbody id="comp-tbody"></tbody></table></div>`;
  filterCompras();
}
function filterCompras(){
  const tbody=el("comp-tbody"); if(!tbody) return;
  const q=norm((el("comp-search")||{value:""}).value);
  const filtered=[...state.purchases].filter(c=>{
    const sup=getSupplier(c.supplierId);
    return !q||norm(c.number).includes(q)||(sup&&norm(sup.name).includes(q));
  }).sort((a,b)=>b.date.localeCompare(a.date));
  tbody.innerHTML=filtered.length?filtered.map(c=>{
    const sup=getSupplier(c.supplierId);
    const openPays=state.payables.filter(p=>p.purchaseId===c.id&&p.status==="aberta").sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
    const nextDue=openPays[0]?.dueDate||null;
    const daysUntil=nextDue?Math.ceil((new Date(nextDue+"T00:00:00")-new Date(today()+"T00:00:00"))/(1000*60*60*24)):null;
    const dueWarn=nextDue&&daysUntil<=7&&daysUntil>=0;
    const dueOver=nextDue&&isOverdue(nextDue);
    const statusColor={paga:"bg-green","a pagar":"bg-amber",parcial:"bg-blue",recebida:"bg-green"}[c.status]||"bg-amber";
    return`<tr>
      <td class="mono text-amber">${c.number}</td>
      <td>${fmtDate(c.date)}</td>
      <td class="text-white">${sup?sup.name:"—"}</td>
      <td class="mono">${c.freight>0?fmt(c.freight):"—"}</td>
      <td class="mono fw-bold">${fmt(c.total)}</td>
      <td><span class="badge bg-blue" style="font-size:10px">${c.paymentMethod||c.paymentTerms||"—"}</span></td>
      <td class="mono ${dueOver?"text-red":dueWarn?"text-amber":""}">${nextDue?fmtDate(nextDue)+"<br><span style='font-size:10px'>"+(dueOver?"⚠ vencida":dueWarn?"⚠ a vencer":"")+"</span>":"—"}</td>
      <td><span class="badge ${statusColor}">${c.status||"a pagar"}</span></td>
      <td><div class="row">
        <button class="btn-sm btn-amber" onclick="viewCompra(${c.id})">Ver</button>
        ${c.status!=="paga"?`<button class="btn-sm btn-ghost" onclick="editCompraModal(${c.id})">Editar</button>`:""}
        ${c.status!=="paga"?`<button class="btn-sm" style="background:rgba(63,185,80,.15);color:var(--green);border-color:rgba(63,185,80,.3)" onclick="pagarCompra(${c.id})">💰 Pagar</button>`:""}
      </div></td>
    </tr>`;}).join(""):`<tr><td colspan="9" class="empty">Nenhuma compra encontrada.</td></tr>`;
}
function openCompraModal(draft){
  if(!draft) state.compraItems=[];
  const nextNum=draft?.nextNum||"CP-"+String(state.purchases.length+1).padStart(4,"0");
  const supId=draft?.supplierId||"";
  const date=draft?.date||today();
  const payMethod=draft?.payMethod||"Pix";
  const installments=draft?.installments||1;
  const freight=draft?.freight||"0";
  const returnProdId=draft?.returnProdId||null;
  showModal(`
    <div class="modal-title">Nova Ordem de Compra — <span class="text-amber mono">${nextNum}</span></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Fornecedor</label>
        <select id="cp-sup" class="form-input"><option value="">Selecione...</option>
        ${state.suppliers.map(s=>`<option value="${s.id}"${s.id==supId?" selected":""}>${s.name}</option>`).join("")}</select>
      </div>
      <div class="form-group"><label class="form-label">Data da Compra</label>
        <input id="cp-date" type="date" class="form-input" value="${date}">
      </div>
    </div>
    <div class="form-grid-3">
      <div class="form-group"><label class="form-label">Forma de Pagamento</label>
        <select id="cp-paymethod" class="form-input">
          ${CP_PAY_METHODS.map(m=>`<option${m===payMethod?" selected":""}>${m}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Nº de Parcelas</label>
        <input id="cp-installments" type="number" min="1" max="24" class="form-input" value="${installments}" oninput="cpRenderInstallments()">
      </div>
      <div class="form-group"><label class="form-label">Frete (R$)</label>
        <input id="cp-freight" type="number" step="0.01" class="form-input" value="${freight}" oninput="compraUpdateTotals()">
      </div>
    </div>
    <div id="cp-installment-dates"></div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">ITENS DA COMPRA</div>
    <div class="row" style="margin-bottom:10px;flex-wrap:wrap">
      <select id="cp-prod" class="form-input" style="flex:2;min-width:160px">
        <option value="">Selecione produto...</option>
        ${state.products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}"${p.id===returnProdId?" selected":""}>${p.name} (${p.unit})</option>`).join("")}
      </select>
      <input id="cp-qty" type="number" min="1" class="form-input" style="width:80px" placeholder="Qtd" value="1">
      <input id="cp-cost" type="number" min="0" step="0.01" class="form-input" style="width:110px" placeholder="Custo unit.">
      <button class="btn btn-primary" onclick="compraAddItem()">+ Add</button>
      <button class="btn btn-ghost" onclick="openProdFromCompra()" title="Cadastrar novo produto">+ Novo</button>
    </div>
    <div id="cp-items-list"></div>
    <div id="cp-totals"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarCompra('${nextNum}')">Registrar Compra</button>
    </div>`,true);
  compraRenderItems();
  cpRenderInstallments(draft?.dueDates||null);
}
function cpRenderInstallments(savedDates){
  const listEl=el("cp-installment-dates"); if(!listEl) return;
  const n=Math.max(1,Math.min(24,parseInt(el("cp-installments")?.value)||1));
  if(n===1){
    listEl.innerHTML=`<div class="form-group" style="margin-bottom:12px"><label class="form-label">Data de Vencimento</label>
      <input id="cp-due-0" type="date" class="form-input" value="${(savedDates&&savedDates[0])||today()}">
    </div>`;
  } else {
    listEl.innerHTML=`<div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:8px;letter-spacing:.06em">${n} PARCELAS — vencimentos individuais (valores divididos igualmente)</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:12px">
    ${Array.from({length:n},(_,i)=>`
      <div class="form-group" style="margin:0">
        <label class="form-label" style="font-size:11px">Parcela ${i+1}/${n}</label>
        <input id="cp-due-${i}" type="date" class="form-input" value="${(savedDates&&savedDates[i])||today()}">
      </div>`).join("")}
    </div>`;
  }
}
function openProdFromCompra(){
  const n=Math.max(1,parseInt(el("cp-installments")?.value)||1);
  const dueDates=Array.from({length:n},(_,i)=>el(`cp-due-${i}`)?.value||today());
  state.compraDraft={
    nextNum:"CP-"+String(state.purchases.length+1).padStart(4,"0"),
    supplierId:el("cp-sup")?.value||"",
    date:el("cp-date")?.value||today(),
    payMethod:el("cp-paymethod")?.value||"Pix",
    installments:n,
    dueDates,
    freight:el("cp-freight")?.value||"0"
  };
  showModal(`<div class="modal-title">Novo Produto <span class="text-muted" style="font-size:12px">— voltará à compra após salvar</span></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Código</label><input id="f-code" class="form-input" value="PRD${String(uid()).slice(-3)}"></div>
      <div class="form-group"><label class="form-label">Categoria</label><select id="f-cat" class="form-input">${CAT_PROD.map(c=>`<option>${c}</option>`).join("")}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Nome do Produto</label><input id="f-name" class="form-input"></div>
    <div class="form-grid-3">
      <div class="form-group"><label class="form-label">Unidade</label><select id="f-unit" class="form-input">${UNITS.map(u=>`<option>${u}</option>`).join("")}</select></div>
      <div class="form-group"><label class="form-label">Preço de Custo (R$) *</label><input id="f-cost" class="form-input" type="number" step="0.01"></div>
      <div class="form-group"><label class="form-label">Preço de Venda (R$)</label><input id="f-price" class="form-input" type="number" step="0.01"></div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Estoque Atual</label><input id="f-stock" class="form-input" type="number" value="0"></div>
      <div class="form-group"><label class="form-label">Estoque Mínimo</label><input id="f-min" class="form-input" type="number" value="0"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="cancelProdFromCompra()">← Voltar à Compra</button>
      <button class="btn btn-primary" onclick="saveProd()">Salvar e Voltar</button>
    </div>`);
}
function cancelProdFromCompra(){
  const draft=state.compraDraft;
  state.compraDraft=null;
  openCompraModal(draft);
}
function compraAddItem(){
  const prodId=parseInt(el("cp-prod").value);
  const qty=parseInt(el("cp-qty").value)||1;
  const cost=parseFloat(el("cp-cost").value)||0;
  if(!prodId||!cost) return alert("Selecione produto e informe o custo unitário.");
  const p=getProd(prodId);
  state.compraItems.push({productId:p.id,qty,unitCost:cost});
  el("cp-prod").value=""; el("cp-qty").value="1"; el("cp-cost").value="";
  compraRenderItems();
}
function compraRemItem(i){ state.compraItems.splice(i,1); compraRenderItems(); }
function compraUpdateTotals(){ compraRenderItems(); }
function compraRenderItems(){
  const sub=state.compraItems.reduce((s,it)=>s+(it.qty*it.unitCost),0);
  const freight=parseFloat((el("cp-freight")||{}).value)||0;
  const total=sub+freight;
  if(el("cp-items-list")) el("cp-items-list").innerHTML=state.compraItems.length?`
    <div class="items-box">
      ${state.compraItems.map((it,i)=>{const p=getProd(it.productId);return`
        <div class="item-row">
          <span style="font-size:13px;color:var(--text2)">${p?p.name:"?"}</span>
          <div class="row">
            <span class="mono text-muted">${it.qty} × ${fmt(it.unitCost)}</span>
            <span class="mono text-white" style="min-width:90px;text-align:right">${fmt(it.qty*it.unitCost)}</span>
            <button class="btn-sm btn-red" onclick="compraRemItem(${i})">✕</button>
          </div>
        </div>`}).join("")}
    </div>`:"";
  if(el("cp-totals")) el("cp-totals").innerHTML=state.compraItems.length?`
    <div class="totals-box" style="margin-top:12px">
      <div class="row-between" style="margin-bottom:4px"><span class="text-muted">Itens</span><span class="mono">${fmt(sub)}</span></div>
      ${freight>0?`<div class="row-between" style="margin-bottom:4px"><span class="text-muted">Frete</span><span class="mono">${fmt(freight)}</span></div>`:""}
      <div class="row-between" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
        <span style="font-family:var(--font-d);font-weight:700">TOTAL</span>
        <span class="mono fw-bold text-amber" style="font-size:16px">${fmt(total)}</span>
      </div>
    </div>`:"";
}
async function salvarCompra(num){
  if(!_guardSave()) return;
  if(!el("cp-sup").value){ _doneSave(); return alert("Selecione o fornecedor."); }
  if(!state.compraItems.length){ _doneSave(); return alert("Adicione pelo menos um item."); }
  const freight=parseFloat(el("cp-freight").value)||0;
  const sub=state.compraItems.reduce((s,it)=>s+(it.qty*it.unitCost),0);
  const total=parseFloat((sub+freight).toFixed(2));
  const date=el("cp-date").value;
  const supplierId=parseInt(el("cp-sup").value);
  const payMethod=el("cp-paymethod").value;
  const nInst=Math.max(1,parseInt(el("cp-installments").value)||1);
  const dueDates=[];
  for(let i=0;i<nInst;i++){
    const d=el(`cp-due-${i}`)?.value;
    if(!d){ _doneSave(); return alert(`Informe a data de vencimento da parcela ${i+1}.`); }
    dueDates.push(d);
  }
  state.compraItems.forEach(it=>{
    const p=state.products.find(x=>x.id===it.productId);
    if(p){
      p.stock+=it.qty;
      if(it.unitCost!==p.costPrice){
        if(!p.priceHistory) p.priceHistory=[];
        p.priceHistory.push({date,salePrice:p.salePrice,costPrice:it.unitCost,note:"Atualizado via compra "+num});
        p.costPrice=it.unitCost;
      }
      state.stockMovements.push({id:uid(),date,productId:it.productId,type:"entrada",qty:it.qty,reason:"Compra",reference:num});
    }
  });
  const purchase={id:uid(),number:num,date,supplierId,items:[...state.compraItems],freight,total,paymentMethod:payMethod,installments:nInst,status:"a pagar"};
  state.purchases.push(purchase);
  const shareAmt=parseFloat((total/nInst).toFixed(2));
  dueDates.forEach((d,i)=>{
    const isLast=i===nInst-1;
    const amt=isLast?parseFloat((total-shareAmt*i).toFixed(2)):shareAmt;
    state.payables.push({id:uid()+(i*7),purchaseId:purchase.id,purchaseNumber:num,supplierId,dueDate:d,amount:amt,installment:i+1,total:nInst,status:"aberta",paidAt:null,description:"Compra "+num,paymentMethod:payMethod});
  });
  await saveToFirebase(); _doneSave(); closeModal(); renderCompras();
  showSyncStatus("✓ Compra registrada — aguardando pagamento");
}
function viewCompra(id){
  const c=state.purchases.find(x=>x.id===id);
  if(!c) return;
  const sup=getSupplier(c.supplierId);
  const pays=state.payables.filter(p=>p.purchaseId===id);
  const statusColor={paga:"bg-green","a pagar":"bg-amber",parcial:"bg-blue",recebida:"bg-green"}[c.status]||"bg-amber";
  const hasOpen=pays.some(p=>p.status==="aberta");
  showModal(`
    <div class="row-between" style="margin-bottom:16px">
      <div class="modal-title" style="margin:0">${c.number}</div>
      <span class="badge ${statusColor}">${c.status||"a pagar"}</span>
    </div>
    <div class="form-grid-2" style="margin-bottom:14px">
      <div><div class="kpi-label">Fornecedor</div><div style="font-size:14px;margin-top:4px;font-weight:600">${sup?sup.name:"—"}</div></div>
      <div><div class="kpi-label">Data da Compra</div><div style="font-size:14px;margin-top:4px">${fmtDate(c.date)}</div></div>
      <div><div class="kpi-label">Forma de Pagamento</div><div style="font-size:14px;margin-top:4px">${c.paymentMethod||c.paymentTerms||"—"}</div></div>
      <div><div class="kpi-label">Parcelas</div><div style="font-size:14px;margin-top:4px">${c.installments||1}x</div></div>
    </div>
    <table><thead><tr><th>Produto</th><th>Qtd</th><th>Custo Unit.</th><th>Total</th></tr></thead><tbody>
      ${c.items.map(it=>{const p=getProd(it.productId);return`<tr>
        <td>${p?p.name:"—"}</td><td class="mono">${it.qty}</td>
        <td class="mono">${fmt(it.unitCost)}</td><td class="mono">${fmt(it.qty*it.unitCost)}</td>
      </tr>`}).join("")}
    </tbody></table>
    <div class="totals-box" style="margin-top:12px">
      ${c.freight>0?`<div class="row-between" style="margin-bottom:4px"><span class="text-muted">Frete</span><span class="mono">${fmt(c.freight)}</span></div>`:""}
      <div class="row-between"><span class="fw-bold">TOTAL</span><span class="mono fw-bold text-amber">${fmt(c.total)}</span></div>
    </div>
    ${pays.length?`<div style="margin-top:16px"><div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:8px;letter-spacing:.06em">PARCELAS</div>
    <table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>
      ${pays.map(p=>`<tr>
        <td class="mono">${p.installment}/${p.total}</td>
        <td class="mono ${isOverdue(p.dueDate)&&p.status==="aberta"?"text-red":""}">${fmtDate(p.dueDate)}${isOverdue(p.dueDate)&&p.status==="aberta"?" ⚠":""}</td>
        <td class="mono">${fmt(p.amount)}</td>
        <td><span class="badge ${p.status==="paga"?"bg-green":"bg-amber"}">${p.status}</span></td>
      </tr>`).join("")}
    </tbody></table></div>`:""}
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
      ${hasOpen?`<button class="btn btn-primary" style="background:var(--green)" onclick="closeModal();pagarCompra(${c.id})">💰 Registrar Pagamento</button>`:""}
    </div>`,true);
}
function pagarCompra(compraId){
  const c=state.purchases.find(x=>x.id==compraId); if(!c) return;
  const pays=state.payables.filter(p=>p.purchaseId==compraId&&p.status==="aberta");
  if(!pays.length){ alert("Não há parcelas em aberto para esta compra."); return; }
  const sup=getSupplier(c.supplierId);
  showModal(`<div class="modal-title">Registrar Pagamento — ${c.number}</div>
    <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">Fornecedor: <b style="color:var(--text)">${sup?sup.name:"—"}</b> &nbsp;|&nbsp; Total: <b style="color:var(--amber)">${fmt(c.total)}</b></div>
    <div class="form-group"><label class="form-label">Data do Pagamento</label>
      <input id="pg-date" type="date" class="form-input" value="${today()}">
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">PARCELAS EM ABERTO</div>
    <table>
      <thead><tr>
        <th><input type="checkbox" checked onchange="document.querySelectorAll('.pg-chk').forEach(x=>x.checked=this.checked)"></th>
        <th>Parcela</th><th>Vencimento</th><th>Valor a Pagar</th>
      </tr></thead>
      <tbody>${pays.map(p=>`<tr>
        <td><input type="checkbox" class="pg-chk" data-id="${p.id}" checked></td>
        <td class="mono text-muted">${p.installment}/${p.total}</td>
        <td class="mono ${isOverdue(p.dueDate)?"text-red":""}">${fmtDate(p.dueDate)}${isOverdue(p.dueDate)?" ⚠":""}</td>
        <td><input type="number" class="form-input pg-amt" data-id="${p.id}" value="${p.amount}" step="0.01" min="0.01" style="width:130px"></td>
      </tr>`).join("")}</tbody>
    </table>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" style="background:var(--green)" onclick="confirmarPagamentoCompra(${c.id})">✓ Confirmar Pagamento</button>
    </div>`);
}
async function confirmarPagamentoCompra(compraId){
  if(!_guardSave()) return;
  const payDate=el("pg-date").value||today();
  const chks=document.querySelectorAll(".pg-chk:checked");
  if(!chks.length){ _doneSave(); alert("Selecione ao menos uma parcela."); return; }
  let totalPago=0;
  chks.forEach(chk=>{
    const p=state.payables.find(x=>x.id==chk.dataset.id);
    const amtInput=document.querySelector(`.pg-amt[data-id="${chk.dataset.id}"]`);
    const amt=parseFloat(amtInput?.value)||p?.amount||0;
    if(p&&p.status==="aberta"){
      if(amt<p.amount-0.01){
        const remainder=parseFloat((p.amount-amt).toFixed(2));
        state.payables.push({...p,id:uid(),amount:remainder,paidAt:null,status:"aberta",installment:p.total+1,total:p.total+1,isSaldo:true});
        p.amount=parseFloat(amt.toFixed(2));
      }
      p.status="paga"; p.paidAt=payDate;
      totalPago+=parseFloat(amt.toFixed(2));
      state.transactions.push({id:uid(),date:payDate,type:"saida",category:"Compras",description:`Pagamento ${p.installment}/${p.total} — ${p.purchaseNumber||"Compra"}`,amount:parseFloat(amt.toFixed(2))});
    }
  });
  const allPays=state.payables.filter(x=>x.purchaseId==compraId&&x.status!=="cancelada");
  const allPaid=allPays.every(x=>x.status==="paga");
  const anyPaid=allPays.some(x=>x.status==="paga");
  const c=state.purchases.find(x=>x.id==compraId);
  if(c) c.status=allPaid?"paga":anyPaid?"parcial":"a pagar";
  try{ await saveToFirebase(); closeModal(); filterCompras(); showSyncStatus(`✓ Pagamento de ${fmt(totalPago)} lançado no caixa`); }
  finally{ _doneSave(); }
}
function editCompraModal(id){
  const c=state.purchases.find(x=>x.id==id); if(!c) return;
  const paidPays=state.payables.filter(p=>p.purchaseId==id&&p.status==="paga");
  if(paidPays.length&&!confirm("Esta compra já possui parcelas pagas. Editar irá recalcular as parcelas em aberto. Continuar?")){return;}
  state.compraItems=[...c.items];
  const pays=state.payables.filter(p=>p.purchaseId==id).sort((a,b)=>a.installment-b.installment);
  const openPays=pays.filter(p=>p.status==="aberta");
  const nInst=openPays.length||c.installments||1;
  const dueDates=openPays.map(p=>p.dueDate);
  showModal(`
    <div class="modal-title">Editar Compra — <span class="text-amber mono">${c.number}</span></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Fornecedor</label>
        <select id="cp-sup" class="form-input"><option value="">Selecione...</option>
        ${state.suppliers.map(s=>`<option value="${s.id}"${s.id==c.supplierId?" selected":""}>${s.name}</option>`).join("")}</select>
      </div>
      <div class="form-group"><label class="form-label">Data da Compra</label>
        <input id="cp-date" type="date" class="form-input" value="${c.date}">
      </div>
    </div>
    <div class="form-grid-3">
      <div class="form-group"><label class="form-label">Forma de Pagamento</label>
        <select id="cp-paymethod" class="form-input">
          ${CP_PAY_METHODS.map(m=>`<option${m===(c.paymentMethod||"Pix")?" selected":""}>${m}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Nº de Parcelas em Aberto</label>
        <input id="cp-installments" type="number" min="1" max="24" class="form-input" value="${nInst}" oninput="cpRenderInstallments()">
      </div>
      <div class="form-group"><label class="form-label">Frete (R$)</label>
        <input id="cp-freight" type="number" step="0.01" class="form-input" value="${c.freight||0}" oninput="compraUpdateTotals()">
      </div>
    </div>
    <div id="cp-installment-dates"></div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">ITENS DA COMPRA</div>
    <div class="row" style="margin-bottom:10px;flex-wrap:wrap">
      <select id="cp-prod" class="form-input" style="flex:2;min-width:160px">
        <option value="">Selecione produto...</option>
        ${state.products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${p.name} (${p.unit})</option>`).join("")}
      </select>
      <input id="cp-qty" type="number" min="1" class="form-input" style="width:80px" placeholder="Qtd" value="1">
      <input id="cp-cost" type="number" min="0" step="0.01" class="form-input" style="width:110px" placeholder="Custo unit.">
      <button class="btn btn-primary" onclick="compraAddItem()">+ Add</button>
    </div>
    <div id="cp-items-list"></div>
    <div id="cp-totals"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEditCompra(${id})">Salvar Alterações</button>
    </div>`,true);
  compraRenderItems();
  cpRenderInstallments(dueDates);
}
async function salvarEditCompra(id){
  if(!_guardSave()) return;
  const c=state.purchases.find(x=>x.id==id); if(!c){ _doneSave(); return; }
  if(!el("cp-sup").value){ _doneSave(); return alert("Selecione o fornecedor."); }
  if(!state.compraItems.length){ _doneSave(); return alert("Adicione pelo menos um item."); }
  const freight=parseFloat(el("cp-freight").value)||0;
  const sub=state.compraItems.reduce((s,it)=>s+(it.qty*it.unitCost),0);
  const total=parseFloat((sub+freight).toFixed(2));
  const date=el("cp-date").value;
  const supplierId=parseInt(el("cp-sup").value);
  const payMethod=el("cp-paymethod").value;
  const nInst=Math.max(1,parseInt(el("cp-installments").value)||1);
  const dueDates=[];
  for(let i=0;i<nInst;i++){
    const d=el(`cp-due-${i}`)?.value;
    if(!d){ _doneSave(); return alert(`Informe a data de vencimento da parcela ${i+1}.`); }
    dueDates.push(d);
  }
  c.items.forEach(it=>{
    const p=state.products.find(x=>x.id===it.productId);
    if(p){ p.stock=Math.max(0,p.stock-it.qty); state.stockMovements.push({id:uid(),date,productId:it.productId,type:"saida",qty:it.qty,reason:"Reversão edição compra",reference:c.number}); }
  });
  state.compraItems.forEach(it=>{
    const p=state.products.find(x=>x.id===it.productId);
    if(p){ p.stock+=it.qty; state.stockMovements.push({id:uid(),date,productId:it.productId,type:"entrada",qty:it.qty,reason:"Edição compra",reference:c.number}); }
  });
  state.payables.forEach(p=>{ if(p.purchaseId==id&&p.status==="aberta") p.status="cancelada"; });
  const shareAmt=parseFloat((total/nInst).toFixed(2));
  dueDates.forEach((d,i)=>{
    const isLast=i===nInst-1;
    const amt=isLast?parseFloat((total-shareAmt*i).toFixed(2)):shareAmt;
    state.payables.push({id:uid()+(i*7),purchaseId:c.id,purchaseNumber:c.number,supplierId,dueDate:d,amount:amt,installment:i+1,total:nInst,status:"aberta",paidAt:null,description:"Compra "+c.number,paymentMethod:payMethod});
  });
  c.items=[...state.compraItems];
  c.freight=freight; c.total=total; c.supplierId=supplierId;
  c.date=date; c.paymentMethod=payMethod; c.installments=nInst;
  if(c.status==="paga") c.status="a pagar";
  try{ await saveToFirebase(); closeModal(); renderCompras(); showSyncStatus("✓ Compra atualizada"); }
  finally{ _doneSave(); }
}
