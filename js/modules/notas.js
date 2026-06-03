// ─── NOTA FISCAL ─────────────────────────────────────────────────────────────
let _nfSort = {col:"date", dir:"desc"};

function renderNotas(){
  const nfMonths=new Set();
  state.invoices.forEach(n=>{ if(n.date) nfMonths.add(n.date.slice(0,7)); });
  const sortedNfMonths=[...nfMonths].sort().reverse();
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Notas Fiscais</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">
        <input id="nf-f-search" class="form-input" style="width:160px" placeholder="Buscar NF/cliente..." oninput="filterNotas()">
        <select id="nf-f-status" class="form-input" style="width:130px" onchange="filterNotas()">
          <option value="">Todos status</option>
          <option value="emitida">Emitida</option>
          <option value="paga">Paga</option>
          <option value="parcial">Parcial</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select id="nf-f-period" class="form-input" style="width:150px" onchange="filterNotas()">
          <option value="">Todos os meses</option>
          ${sortedNfMonths.map(m=>{const [y,mo]=m.split("-");const ml=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(mo)-1];return`<option value="${m}">${ml}/${y}</option>`;}).join("")}
        </select>
        <button class="btn btn-primary" onclick="openNFModal()">+ Nova Nota Fiscal</button>
      </div>
    </div>
    <div class="card" style="overflow-x:auto"><table><thead><tr>
      ${[["number","Número"],["date","Data"],["clientId","Cliente"],["subtotal","Subtotal"],["","Desc."],["","Frete"],["total","Total"],["","Pagamento"],["","Status"],["","Ações"]].map(([col,lbl])=>col?`<th style="cursor:pointer;user-select:none;white-space:nowrap" onclick="nfSortBy('${col}')">${lbl} ${_nfSort.col===col?(_nfSort.dir==="asc"?"▲":"▼"):""}</th>`:`<th>${lbl}</th>`).join("")}
    </tr></thead><tbody id="nf-tbody"></tbody></table></div>`;
  filterNotas();
}
function nfSortBy(col){
  if(_nfSort.col===col) _nfSort.dir=_nfSort.dir==="asc"?"desc":"asc";
  else { _nfSort.col=col; _nfSort.dir="desc"; }
  renderNotas();
}
function filterNotas(){
  const fSearch=norm((el("nf-f-search")||{}).value||"");
  const fStatus=(el("nf-f-status")||{}).value||"";
  const fPeriod=(el("nf-f-period")||{}).value||"";
  const tbody=el("nf-tbody"); if(!tbody) return;
  const {col,dir}=_nfSort;
  const sorted=[...state.invoices]
    .filter(n=>(!fStatus||n.status===fStatus)&&(!fPeriod||n.date?.startsWith(fPeriod))&&(!fSearch||norm(n.number).includes(fSearch)||norm(getClient(n.clientId)?.name).includes(fSearch)))
    .sort((a,b)=>{
      let va=a[col]??"", vb=b[col]??"";
      if(col==="clientId"){ va=norm(getClient(a.clientId)?.name||""); vb=norm(getClient(b.clientId)?.name||""); }
      if(typeof va==="number") return dir==="asc"?va-vb:vb-va;
      return dir==="asc"?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));
    });
  tbody.innerHTML=sorted.length?sorted.map(n=>{
    const c=getClient(n.clientId);
    const statusColor={paga:"bg-green",parcial:"bg-blue",emitida:"bg-amber",cancelada:"bg-gray"}[n.status]||"bg-gray";
    return`<tr class="${n.status==="cancelada"?"cancelled-row":""}">
      <td class="mono text-amber">${n.number}</td>
      <td>${fmtDate(n.date)}</td>
      <td class="text-white">${c?c.name:"—"}</td>
      <td class="mono">${fmt(n.subtotal)}</td>
      <td class="mono">${n.discount>0?n.discount+"%":"—"}</td>
      <td class="mono">${n.freight>0?fmt(n.freight):"—"}</td>
      <td class="mono fw-bold">${fmt(n.total)}</td>
      <td><span class="badge bg-blue" style="font-size:10px">${n.paymentTerms}</span></td>
      <td><span class="badge ${statusColor}">${n.status}</span></td>
      <td><div class="row">
        <button class="btn-sm btn-amber" onclick="viewNF(${n.id})">Ver</button>
        <button class="btn-sm" onclick="printNF(${n.id})" title="Imprimir">🖨</button>
        ${(n.status==="emitida"||n.status==="parcial")?`<button class="btn-sm" style="background:rgba(63,185,80,.15);color:var(--green);border-color:rgba(63,185,80,.3)" onclick="darBaixaNF(${n.id})">💰 Receber</button>`:""}
        ${n.status!=="cancelada"&&n.status!=="paga"?`<button class="btn-sm btn-red" onclick="cancelNF(${n.id})">Cancelar</button>`:""}
      </div></td>
    </tr>`;}).join(""):`<tr><td colspan="10" class="empty">Nenhuma nota encontrada.</td></tr>`;
}

function openNFModal(){
  state.nfItems=[];
  state.nfCosts=[];
  const nextNum="NF-"+String(state.invoices.length+1).padStart(4,"0");
  showModal(`
    <div class="modal-title">Emitir Nota Fiscal — <span class="text-amber mono">${nextNum}</span></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Cliente</label>
        <select id="nf-client" class="form-input"><option value="">Selecione...</option>
        ${state.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join("")}</select>
      </div>
      <div class="form-group"><label class="form-label">Data de Emissão</label>
        <input id="nf-date" type="date" class="form-input" value="${today()}">
      </div>
    </div>
    <div class="form-grid-3">
      <div class="form-group"><label class="form-label">Condição de Pagamento</label>
        <select id="nf-terms" class="form-input">
          ${PAY_TERMS.map(t=>`<option>${t}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Desconto Geral (%)</label>
        <input id="nf-disc" type="number" min="0" max="100" step="0.1" class="form-input" value="0" oninput="nfUpdateTotals()">
      </div>
      <div class="form-group"><label class="form-label">Frete no PDF (R$)</label>
        <input id="nf-freight" type="number" min="0" step="0.01" class="form-input" value="0" oninput="nfUpdateTotals()">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Frete Interno (R$) <span class="text-muted" style="font-size:10px;font-weight:400">— não aparece no PDF, lança saída no caixa</span></label>
        <input id="nf-freight-int" type="number" min="0" step="0.01" class="form-input" value="0">
      </div>
      <div class="form-group"><label class="form-label">Observações <span class="text-muted" style="font-size:10px;font-weight:400">— aparece no PDF</span></label>
        <input id="nf-obs" class="form-input" placeholder="Observações da nota...">
      </div>
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">ITENS DA NOTA</div>
    <div style="margin-bottom:10px">
      <input id="nf-prod-search" class="form-input" style="width:100%;margin-bottom:6px" placeholder="🔍 Buscar produto pelo nome..." oninput="nfRenderProdList(this.value)" autocomplete="off">
      <div id="nf-prod-list" style="max-height:210px;overflow-y:auto;border:1px solid var(--border);border-radius:6px"></div>
    </div>
    <div id="nf-items-list"></div>
    <div id="nf-totals"></div>
    <div class="divider"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.06em">CUSTOS OPERACIONAIS</div>
      <button class="btn btn-ghost" style="padding:3px 10px;font-size:12px" onclick="nfAddCost()">+ Adicionar Custo</button>
    </div>
    <div id="nf-costs-list"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="emitirNF('${nextNum}')">Emitir Nota</button>
    </div>`,true);
  nfRenderItems();
  nfRenderProdList("");
  nfRenderCosts();
}
function nfAddCost(){
  if(!state.nfCosts) state.nfCosts=[];
  state.nfCosts.push({description:"",value:0,clientPays:true});
  nfRenderCosts();
}
function nfRemCost(i){
  state.nfCosts.splice(i,1);
  nfRenderCosts();
  nfRenderItems();
}
function nfCostChange(i,field,val){
  if(!state.nfCosts[i]) return;
  if(field==="value") state.nfCosts[i].value=parseFloat(val)||0;
  else if(field==="description") state.nfCosts[i].description=val;
  else if(field==="clientPays") state.nfCosts[i].clientPays=val;
  nfRenderItems();
}
function nfRenderCosts(){
  const listEl=el("nf-costs-list"); if(!listEl) return;
  const costs=state.nfCosts||[];
  if(!costs.length){
    listEl.innerHTML=`<div style="color:var(--muted);font-size:13px;padding:6px 0;text-align:center">Nenhum custo adicional</div>`;
    return;
  }
  listEl.innerHTML=costs.map((c,i)=>`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
      <input class="form-input" style="flex:2;min-width:140px" placeholder="Descrição do custo" value="${(c.description||'').replace(/"/g,'&quot;')}" oninput="nfCostChange(${i},'description',this.value)">
      <input type="number" min="0" step="0.01" class="form-input" style="width:110px" placeholder="R$ 0,00" value="${c.value||''}" oninput="nfCostChange(${i},'value',this.value)">
      <label style="display:flex;align-items:center;gap:5px;color:var(--text2);font-size:12px;white-space:nowrap;cursor:pointer">
        <input type="checkbox" ${c.clientPays?"checked":""} onchange="nfCostChange(${i},'clientPays',this.checked)">
        <span>Cliente paga</span>
      </label>
      <span style="font-size:11px;color:var(--muted);white-space:nowrap">${c.clientPays?"→ entra no total da NF":"→ lança saída no caixa"}</span>
      <button class="btn-sm btn-red" onclick="nfRemCost(${i})">✕</button>
    </div>`).join("");
}
function nfRenderProdList(search){
  const listEl=el("nf-prod-list");
  if(!listEl) return;
  const q=norm(search||"");
  const prods=state.products.filter(p=>p.active!==false&&(!q||norm(p.name).includes(q)||(p.code&&norm(p.code).includes(q))));
  if(!prods.length){ listEl.innerHTML=`<div style="padding:14px;text-align:center;color:var(--muted);font-size:13px">Nenhum produto encontrado</div>`; return; }
  listEl.innerHTML=prods.map(p=>`
    <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--border);background:var(--bg2);transition:background .1s" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='var(--bg2)'">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
        <div style="font-size:11px;color:var(--muted)">${p.unit} &nbsp;·&nbsp; Estoque: <span style="color:${p.stock>0?'var(--green)':'var(--red)'}">${p.stock}</span></div>
      </div>
      <div style="min-width:72px;text-align:right;color:var(--amber);font-size:13px;font-weight:600;flex-shrink:0">${fmt(p.salePrice)}</div>
      <input type="number" id="nf-row-qty-${p.id}" class="form-input" value="1" min="1" style="width:58px;padding:4px 6px;flex-shrink:0" title="Quantidade">
      <input type="number" id="nf-row-disc-${p.id}" class="form-input" value="0" min="0" max="100" style="width:52px;padding:4px 6px;flex-shrink:0" placeholder="Desc%">
      <button class="btn btn-primary" style="padding:4px 10px;font-size:12px;flex-shrink:0" id="nf-row-btn-${p.id}" onclick="nfAddItemFromList(${p.id})">+ Add</button>
    </div>`).join("");
}
function nfAddItemFromList(prodId){
  const p=getProd(prodId);
  if(!p) return;
  const qty=parseInt(el(`nf-row-qty-${prodId}`)?.value)||1;
  const disc=parseFloat(el(`nf-row-disc-${prodId}`)?.value)||0;
  const existing=state.nfItems.find(it=>it.productId===prodId);
  if(existing){ existing.qty+=qty; }
  else{ state.nfItems.push({productId:p.id,qty,price:p.salePrice,itemDiscount:disc}); }
  const qEl=el(`nf-row-qty-${prodId}`); if(qEl) qEl.value="1";
  const dEl=el(`nf-row-disc-${prodId}`); if(dEl) dEl.value="0";
  const btn=el(`nf-row-btn-${prodId}`);
  if(btn){ btn.textContent="✓ Adicionado"; btn.style.background="var(--green)"; setTimeout(()=>{ btn.textContent="+ Add"; btn.style.background=""; },900); }
  nfRenderItems();
}
function nfAddItem(){ /* legacy */ }
function nfRemItem(i){ state.nfItems.splice(i,1); nfRenderItems(); }
function nfGetSubtotal(){ return state.nfItems.reduce((s,it)=>s+(it.qty*it.price*(1-(it.itemDiscount||0)/100)),0); }
function nfUpdateTotals(){ nfRenderItems(); }
function nfRenderItems(){
  const sub=nfGetSubtotal();
  const disc=parseFloat((el("nf-disc")||{}).value)||0;
  const freight=parseFloat((el("nf-freight")||{}).value)||0;
  const clientCosts=(state.nfCosts||[]).filter(c=>c.clientPays).reduce((s,c)=>s+(parseFloat(c.value)||0),0);
  const total=sub*(1-disc/100)+freight+clientCosts;
  if(el("nf-items-list")) el("nf-items-list").innerHTML=state.nfItems.length?`
    <div class="items-box">
      ${state.nfItems.map((it,i)=>{const p=getProd(it.productId);const lineTotal=it.qty*it.price*(1-(it.itemDiscount||0)/100);return`
        <div class="item-row">
          <div>
            <span style="font-size:13px;color:var(--text2)">${p?p.name:"?"}</span>
            ${it.itemDiscount>0?`<span class="badge bg-amber" style="margin-left:6px">${it.itemDiscount}% desc</span>`:""}
          </div>
          <div class="row">
            <span class="mono text-muted">${it.qty} × ${fmt(it.price)}</span>
            <span class="mono text-white" style="min-width:90px;text-align:right">${fmt(lineTotal)}</span>
            <button class="btn-sm btn-red" onclick="nfRemItem(${i})">✕</button>
          </div>
        </div>`}).join("")}
    </div>`:"";
  if(el("nf-totals")) el("nf-totals").innerHTML=state.nfItems.length?`
    <div class="totals-box" style="margin-top:12px">
      <div class="row-between" style="margin-bottom:6px"><span class="text-muted">Subtotal</span><span class="mono">${fmt(sub)}</span></div>
      ${disc>0?`<div class="row-between" style="margin-bottom:6px"><span class="text-muted">Desconto (${disc}%)</span><span class="mono text-red">− ${fmt(sub*disc/100)}</span></div>`:""}
      ${freight>0?`<div class="row-between" style="margin-bottom:6px"><span class="text-muted">Frete PDF</span><span class="mono">+ ${fmt(freight)}</span></div>`:""}
      ${clientCosts>0?`<div class="row-between" style="margin-bottom:6px"><span class="text-muted">Custos (cliente paga)</span><span class="mono">+ ${fmt(clientCosts)}</span></div>`:""}
      <div class="row-between" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
        <span style="font-family:var(--font-d);font-weight:700">TOTAL</span>
        <span style="font-family:var(--font-m);font-weight:700;font-size:18px;color:var(--amber)">${fmt(total)}</span>
      </div>
    </div>`:"";
}
async function emitirNF(num){
  if(!_guardSave()) return;
  if(!el("nf-client").value){ _doneSave(); return alert("Selecione o cliente."); }
  if(!state.nfItems.length){ _doneSave(); return alert("Adicione pelo menos um item."); }
  const sub=nfGetSubtotal();
  const disc=parseFloat(el("nf-disc").value)||0;
  const freight=parseFloat(el("nf-freight").value)||0;
  const freightInt=parseFloat(el("nf-freight-int")?.value)||0;
  const obs=(el("nf-obs")?.value||"").trim();
  const costs=[...(state.nfCosts||[])].filter(c=>c.description||c.value>0);
  const clientCosts=costs.filter(c=>c.clientPays).reduce((s,c)=>s+(parseFloat(c.value)||0),0);
  const total=parseFloat((sub*(1-disc/100)+freight+clientCosts).toFixed(2));
  const date=el("nf-date").value;
  const clientId=parseInt(el("nf-client").value);
  const terms=el("nf-terms").value;
  const client=getClient(clientId);
  const openAmt=state.receivables.filter(r=>r.clientId===clientId&&r.status==="aberta").reduce((s,r)=>s+r.amount,0);
  if(client.creditLimit>0&&(openAmt+total)>client.creditLimit){
    if(!confirm(`Atenção: este cliente tem ${fmt(openAmt)} em aberto. O limite de crédito é ${fmt(client.creditLimit)}. Limite será ultrapassado. Continuar?`)){ _doneSave(); return; }
  }
  const stockWarnings=state.nfItems.filter(it=>{const p=getProd(it.productId);return p&&p.stock<it.qty;});
  if(stockWarnings.length){
    const msg=stockWarnings.map(it=>{const p=getProd(it.productId);return `• ${p.name}: estoque ${p.stock}, pedido ${it.qty}`;}).join("\n");
    alert(`Estoque insuficiente. Não é possível emitir a nota:\n\n${msg}`);
    _doneSave(); return;
  }
  try{
    const nf={id:uid(),number:num,date,clientId,items:[...state.nfItems],discount:disc,freight,paymentTerms:terms,subtotal:parseFloat(sub.toFixed(2)),total,status:"emitida"};
    if(obs) nf.notes=obs;
    if(freightInt>0) nf.internalFreight=freightInt;
    if(costs.length) nf.costs=costs;
    state.nfItems.forEach(it=>{
      const p=state.products.find(x=>x.id===it.productId);
      if(p){ p.stock=Math.max(0,p.stock-it.qty); state.stockMovements.push({id:uid(),date,productId:it.productId,type:"saida",qty:it.qty,reason:"Venda",reference:num}); }
    });
    const recs=generateReceivables(nf.id,num,clientId,total,date,terms);
    state.receivables.push(...recs);
    if(freightInt>0){
      state.transactions.push({id:uid(),date,type:"saida",category:"Logística",description:`Frete interno — ${num}`,amount:freightInt});
    }
    costs.filter(c=>!c.clientPays&&c.value>0).forEach(c=>{
      state.transactions.push({id:uid(),date,type:"saida",category:"Operacional",description:`${c.description||"Custo operacional"} — ${num}`,amount:parseFloat(c.value)||0});
    });
    state.invoices.push(nf);
    await saveToFirebase(); closeModal(); filterNotas();
    showSyncStatus("✓ Nota fiscal emitida");
  }finally{ _doneSave(); }
}
function viewNF(id){
  const n=state.invoices.find(x=>x.id===id);
  const c=getClient(n.clientId);
  const recs=state.receivables.filter(r=>r.invoiceId===id);
  const statusColor={paga:"bg-green",parcial:"bg-blue",emitida:"bg-amber",cancelada:"bg-gray"}[n.status]||"bg-gray";
  showModal(`
    <div class="row-between" style="margin-bottom:20px">
      <div class="modal-title" style="margin:0">${n.number}</div>
      <div class="row"><span class="badge ${statusColor}">${n.status}</span>
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" onclick="printNF(${n.id})">🖨 Imprimir</button>
      </div>
    </div>
    <div class="form-grid-2" style="margin-bottom:16px">
      <div><div class="kpi-label">Cliente</div><div style="font-size:14px;margin-top:4px;font-weight:600">${c?c.name:"—"}</div></div>
      <div><div class="kpi-label">Data / Pagamento</div><div style="font-size:14px;margin-top:4px">${fmtDate(n.date)} · ${n.paymentTerms}</div></div>
    </div>
    <table><thead><tr><th>Produto</th><th>Qtd</th><th>Preço Unit.</th><th>Desc.</th><th>Total</th></tr></thead><tbody>
      ${n.items.map(it=>{const p=getProd(it.productId);const d=it.itemDiscount||0;const t=it.qty*it.price*(1-d/100);return`<tr>
        <td>${p?p.name:"—"} <span class="text-muted mono" style="font-size:11px">${p?p.unit:""}</span></td>
        <td class="mono">${it.qty}</td><td class="mono">${fmt(it.price)}</td>
        <td class="mono">${d>0?d+"%":"—"}</td>
        <td class="mono">${fmt(t)}</td>
      </tr>`}).join("")}
    </tbody></table>
    <div class="totals-box" style="margin-top:14px">
      <div class="row-between" style="margin-bottom:4px"><span class="text-muted">Subtotal</span><span class="mono">${fmt(n.subtotal)}</span></div>
      ${n.discount>0?`<div class="row-between" style="margin-bottom:4px"><span class="text-muted">Desconto (${n.discount}%)</span><span class="mono text-red">− ${fmt(n.subtotal*n.discount/100)}</span></div>`:""}
      ${n.freight>0?`<div class="row-between" style="margin-bottom:4px"><span class="text-muted">Frete PDF</span><span class="mono">+ ${fmt(n.freight)}</span></div>`:""}
      ${(n.costs||[]).filter(c=>c.clientPays).map(c=>`<div class="row-between" style="margin-bottom:4px"><span class="text-muted">${c.description||"Custo"} <span style="font-size:10px">(cliente)</span></span><span class="mono">+ ${fmt(c.value||0)}</span></div>`).join("")}
      <div class="row-between" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
        <span style="font-family:var(--font-d);font-weight:700">TOTAL</span>
        <span class="mono fw-bold text-amber" style="font-size:16px">${fmt(n.total)}</span>
      </div>
      ${n.returnedTotal>0?`<div class="row-between" style="margin-top:4px"><span class="text-muted">Devolvido</span><span class="mono text-red">− ${fmt(n.returnedTotal)}</span></div><div class="row-between" style="padding-top:4px;border-top:1px dashed var(--border);margin-top:4px"><span style="font-size:12px;font-weight:600">Líquido recebível</span><span class="mono fw-bold" style="font-size:13px">${fmt(Math.max(0,n.total-n.returnedTotal))}</span></div>`:""}
      ${n.internalFreight>0?`<div class="row-between" style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--border)"><span class="text-muted" style="font-size:12px">Frete Interno (caixa)</span><span class="mono text-red" style="font-size:12px">− ${fmt(n.internalFreight)}</span></div>`:""}
      ${(n.costs||[]).filter(c=>!c.clientPays&&c.value>0).map(c=>`<div class="row-between" style="margin-top:4px"><span class="text-muted" style="font-size:12px">${c.description||"Custo"} (caixa)</span><span class="mono text-red" style="font-size:12px">− ${fmt(c.value||0)}</span></div>`).join("")}
    </div>
    ${n.notes?`<div style="margin-top:12px;padding:10px 12px;background:var(--bg2);border-radius:6px;border:1px solid var(--border)"><span style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Observações</span><div style="margin-top:6px;font-size:13px;color:var(--text2)">${n.notes}</div></div>`:""}
    ${recs.length?`<div style="margin-top:16px"><div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:8px;letter-spacing:.06em">PARCELAS</div>
    <table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>
      ${recs.map(r=>`<tr>
        <td class="mono">${r.installment}/${r.total}</td>
        <td class="mono ${isOverdue(r.dueDate)&&r.status==="aberta"?"text-red":""}">${fmtDate(r.dueDate)}${isOverdue(r.dueDate)&&r.status==="aberta"?" ⚠":""}</td>
        <td class="mono">${fmt(r.amount)}</td>
        <td><span class="badge ${r.status==="paga"?"bg-green":r.status==="cancelada"?"bg-gray":"bg-amber"}">${r.status}</span></td>
      </tr>`).join("")}
    </tbody></table></div>`:""}
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
      ${(n.status==="emitida"||n.status==="paga"||n.status==="parcial")?`<button class="btn btn-ghost" onclick="openDevolucaoModal('${n.id}')">↩ Devolver</button>`:""}
      ${n.status!=="cancelada"&&n.status!=="paga"?`<button class="btn btn-danger" onclick="cancelNF('${n.id}');closeModal()">Cancelar NF</button>`:""}
    </div>`,true);
}
async function cancelNF(id){
  if(!confirm("Cancelar esta nota fiscal? O estoque será restaurado.")) return;
  if(!_guardSave()) return;
  const n=state.invoices.find(x=>x.id==id);
  if(!n){ _doneSave(); return; }
  n.status="cancelada";
  n.items.forEach(it=>{
    const p=state.products.find(x=>x.id===it.productId);
    if(p){ p.stock+=it.qty; state.stockMovements.push({id:uid(),date:today(),productId:it.productId,type:"entrada",qty:it.qty,reason:"Cancelamento NF",reference:n.number}); }
  });
  state.receivables.forEach(r=>{ if(r.invoiceId==id&&r.status==="aberta") r.status="cancelada"; });
  try{ await saveToFirebase(); renderNotas(); showSyncStatus("✓ NF cancelada"); }
  finally{ _doneSave(); }
}

// ─── DAR BAIXA NF ─────────────────────────────────────────────────────────────
function darBaixaNF(nfId){
  const nf=state.invoices.find(n=>n.id==nfId);
  if(!nf) return;
  const recs=state.receivables.filter(r=>r.invoiceId===nf.id&&r.status==="aberta");
  if(!recs.length){ alert("Não há parcelas em aberto para esta nota."); return; }
  const c=getClient(nf.clientId);
  showModal(`<div class="modal-title">Registrar Recebimento — ${nf.number}</div>
    <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">Cliente: <b style="color:var(--text)">${c?c.name:"—"}</b> &nbsp;|&nbsp; Total da NF: <b style="color:var(--amber)">${fmt(nf.total)}</b></div>
    <div class="form-group"><label class="form-label">Data de Recebimento</label>
      <input id="bx-date" type="date" class="form-input" value="${today()}">
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">PARCELAS EM ABERTO</div>
    <table class="table">
      <thead><tr><th><input type="checkbox" checked onchange="document.querySelectorAll('.bx-chk').forEach(c=>c.checked=this.checked)"></th><th>Parcela</th><th>Vencimento</th><th>Valor a Receber</th></tr></thead>
      <tbody>${recs.map(r=>`<tr>
        <td><input type="checkbox" class="bx-chk" data-id="${r.id}" checked></td>
        <td style="color:var(--muted)">${r.installment}/${r.total}</td>
        <td style="color:${isOverdue(r.dueDate)?"var(--red)":"var(--text)"}">${fmtDate(r.dueDate)}${isOverdue(r.dueDate)?" ⚠":""}</td>
        <td><input type="number" class="form-input bx-amt" data-id="${r.id}" value="${r.amount}" step="0.01" min="0.01" style="width:130px" title="Altere para registrar pagamento parcial"></td>
      </tr>`).join("")}</tbody>
    </table>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" style="background:var(--green)" onclick="confirmarBaixa(${nf.id})">✓ Confirmar Recebimento</button>
    </div>`);
}
async function confirmarBaixa(nfId){
  if(!_guardSave()) return;
  const payDate=el("bx-date").value||today();
  const chks=document.querySelectorAll(".bx-chk:checked");
  if(!chks.length){ _doneSave(); alert("Selecione ao menos uma parcela."); return; }
  let totalRecebido=0;
  chks.forEach(chk=>{
    const r=state.receivables.find(x=>x.id==chk.dataset.id);
    const amtInput=document.querySelector(`.bx-amt[data-id="${chk.dataset.id}"]`);
    const amt=parseFloat(amtInput?.value)||r?.amount||0;
    if(r&&r.status==="aberta"){
      if(amt<r.amount-0.01){
        const remainder=parseFloat((r.amount-amt).toFixed(2));
        state.receivables.push({...r,id:uid(),amount:remainder,paidAt:null,status:"aberta",installment:r.total+1,total:r.total+1,isSaldo:true});
        r.amount=parseFloat(amt.toFixed(2));
      }
      r.status="paga"; r.paidAt=payDate;
      totalRecebido+=parseFloat(amt.toFixed(2));
      state.transactions.push({id:uid(),date:payDate,type:"entrada",category:"Vendas",description:`Recebimento ${r.installment}/${r.total} — ${r.invoiceNumber||"NF"}`,amount:parseFloat(amt.toFixed(2))});
    }
  });
  const nfRecs=state.receivables.filter(x=>x.invoiceId===nfId&&x.status!=="cancelada");
  const allPaid=nfRecs.every(x=>x.status==="paga");
  const anyPaid=nfRecs.some(x=>x.status==="paga");
  const nf=state.invoices.find(x=>x.id===nfId);
  if(nf) nf.status=allPaid?"paga":anyPaid?"parcial":"emitida";
  try{ await saveToFirebase(); closeModal(); filterNotas(); showSyncStatus(`✓ Recebimento de ${fmt(totalRecebido)} registrado no caixa`); }
  finally{ _doneSave(); }
}

function nfFilterProds(search){ nfRenderProdList(search); }
