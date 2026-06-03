// ─── PEDIDOS DE VENDA ─────────────────────────────────────────────────────────
function renderPedidos(){
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Pedidos de Venda</div>
      <div class="row">
        <input id="ped-search" class="form-input" style="width:200px" placeholder="Buscar pedido..." oninput="filterPedidos()">
        <button class="btn btn-primary" onclick="openPedidoModal()">+ Novo Pedido</button>
      </div>
    </div>
    <div class="card" style="overflow-x:auto">
      <table class="table">
        <thead><tr><th>Número</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody id="ped-tbody"></tbody>
      </table>
    </div>`;
  filterPedidos();
}
function filterPedidos(){
  const tbody=el("ped-tbody"); if(!tbody) return;
  const q=norm((el("ped-search")||{value:""}).value);
  const statusLabel={rascunho:"Rascunho",confirmado:"Confirmado",faturado:"Faturado",cancelado:"Cancelado"};
  const statusColor={rascunho:"var(--muted)",confirmado:"var(--blue)",faturado:"var(--green)",cancelado:"var(--red)"};
  const filtered=(state.orders||[]).filter(o=>{
    const c=getClient(o.clientId);
    return !q||norm(o.number).includes(q)||(c&&norm(c.name).includes(q));
  }).sort((a,b)=>b.id-a.id);
  tbody.innerHTML=filtered.length?filtered.map(o=>{
    const c=getClient(o.clientId);
    return `<tr>
      <td><span class="badge">${o.number}</span></td>
      <td>${fmtDate(o.date)}</td>
      <td>${c?c.name:"—"}</td>
      <td>${o.items.length} item(s)</td>
      <td>${fmt(o.total)}</td>
      <td><span style="color:${statusColor[o.status]||"var(--muted)"}">${statusLabel[o.status]||o.status}</span></td>
      <td><div class="row" style="gap:4px">
        <button class="btn btn-ghost" style="padding:4px 8px;font-size:12px" onclick="viewPedido('${o.id}')">Ver</button>
        ${o.status==="rascunho"||o.status==="confirmado"?`<button class="btn btn-ghost" style="padding:4px 8px;font-size:12px" onclick="editarPedidoModal('${o.id}')">Editar</button>`:""}
        ${o.status==="rascunho"?`<button class="btn btn-primary" style="padding:4px 8px;font-size:12px" onclick="confirmarPedido('${o.id}')">Confirmar</button>`:""}
        ${o.status==="confirmado"?`<button class="btn btn-primary" style="padding:4px 8px;font-size:12px;background:var(--green)" onclick="faturarPedido('${o.id}')">Faturar</button>`:""}
        ${o.status==="rascunho"||o.status==="confirmado"?`<button class="btn btn-ghost" style="padding:4px 8px;font-size:12px;color:var(--red)" onclick="cancelarPedido('${o.id}')">Cancelar</button>`:""}
      </div></td>
    </tr>`;}).join(""):`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px">Nenhum pedido encontrado</td></tr>`;
}

function openPedidoModal(prefill){
  state.pedidoItems=prefill?[...prefill.items]:[];
  const clients=state.clients||[];
  const nextNum="PED-"+String((state.orders||[]).length+1).padStart(4,"0");
  openModal(`<div class="modal-title">Novo Pedido de Venda</div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Número</label>
        <input id="ped-num" class="form-input" value="${nextNum}" readonly>
      </div>
      <div class="form-group"><label class="form-label">Data</label>
        <input id="ped-date" type="date" class="form-input" value="${today()}">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Cliente</label>
      <select id="ped-client" class="form-input">
        <option value="">Selecione cliente...</option>
        ${clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join("")}
      </select>
    </div>
    <div class="form-grid-3">
      <div class="form-group"><label class="form-label">Condição de Pagamento</label>
        <select id="ped-terms" class="form-input">
          ${PAY_TERMS.map(t=>`<option>${t}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Desconto Geral (%)</label>
        <input id="ped-disc" type="number" min="0" max="100" step="0.1" class="form-input" value="0" oninput="pedidoRenderItems()">
      </div>
      <div class="form-group"><label class="form-label">Frete (R$)</label>
        <input id="ped-freight" type="number" min="0" step="0.01" class="form-input" value="0" oninput="pedidoRenderItems()">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Observações</label>
      <textarea id="ped-notes" class="form-input" rows="2" style="resize:vertical"></textarea>
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">ITENS DO PEDIDO</div>
    <div style="margin-bottom:10px">
      <input id="ped-prod-search" class="form-input" style="width:100%;margin-bottom:6px" placeholder="🔍 Buscar produto pelo nome..." oninput="pedidoRenderProdList(this.value)" autocomplete="off">
      <div id="ped-prod-list" style="max-height:210px;overflow-y:auto;border:1px solid var(--border);border-radius:6px"></div>
    </div>
    <div id="ped-items-list"></div>
    <div id="ped-totals"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-ghost" onclick="salvarPedido('${nextNum}')">Salvar Rascunho</button>
      <button class="btn btn-primary" onclick="salvarPedido('${nextNum}',true)">Confirmar Pedido</button>
    </div>`,true);
  pedidoRenderItems();
  pedidoRenderProdList("");
}
function pedidoRenderProdList(search){
  const listEl=el("ped-prod-list");
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
      <input type="number" id="ped-row-qty-${p.id}" class="form-input" value="1" min="1" style="width:58px;padding:4px 6px;flex-shrink:0" title="Quantidade">
      <input type="number" id="ped-row-disc-${p.id}" class="form-input" value="0" min="0" max="100" style="width:52px;padding:4px 6px;flex-shrink:0" placeholder="Desc%">
      <button class="btn btn-primary" style="padding:4px 10px;font-size:12px;flex-shrink:0" id="ped-row-btn-${p.id}" onclick="pedidoAddItemFromList(${p.id})">+ Add</button>
    </div>`).join("");
}
function pedidoAddItemFromList(prodId){
  const p=getProd(prodId);
  if(!p) return;
  const qty=parseInt(el(`ped-row-qty-${prodId}`)?.value)||1;
  const disc=parseFloat(el(`ped-row-disc-${prodId}`)?.value)||0;
  const existing=state.pedidoItems.find(it=>it.productId===prodId);
  if(existing){ existing.qty+=qty; }
  else{ state.pedidoItems.push({productId:p.id,name:p.name,unit:p.unit,qty,price:p.salePrice,itemDiscount:disc}); }
  const qEl=el(`ped-row-qty-${prodId}`); if(qEl) qEl.value="1";
  const dEl=el(`ped-row-disc-${prodId}`); if(dEl) dEl.value="0";
  const btn=el(`ped-row-btn-${prodId}`);
  if(btn){ btn.textContent="✓ Adicionado"; btn.style.background="var(--green)"; setTimeout(()=>{ btn.textContent="+ Add"; btn.style.background=""; },900); }
  pedidoRenderItems();
}
function pedidoFilterProds(search){ pedidoRenderProdList(search); }
function pedidoAddItem(){
  const prodId=parseInt(el("ped-prod")?.value);
  const qty=parseInt(el("ped-qty")?.value)||1;
  const disc=parseFloat(el("ped-item-disc")?.value)||0;
  if(!prodId) return;
  const p=getProd(prodId);
  if(!p) return;
  state.pedidoItems.push({productId:p.id,name:p.name,unit:p.unit,qty,price:p.salePrice,itemDiscount:disc});
  el("ped-prod").value=""; el("ped-qty").value="1"; el("ped-item-disc").value="0";
  pedidoRenderItems();
}
function pedidoRemItem(i){ state.pedidoItems.splice(i,1); pedidoRenderItems(); }
function pedidoGetSubtotal(){ return state.pedidoItems.reduce((s,it)=>s+(it.qty*it.price*(1-(it.itemDiscount||0)/100)),0); }
function pedidoRenderItems(){
  const listEl=el("ped-items-list");
  const totEl=el("ped-totals");
  if(!listEl||!totEl) return;
  const disc=parseFloat(el("ped-disc")?.value)||0;
  const freight=parseFloat(el("ped-freight")?.value)||0;
  const sub=pedidoGetSubtotal();
  const discAmt=sub*disc/100;
  const total=sub-discAmt+freight;
  listEl.innerHTML=state.pedidoItems.length?`<table class="table" style="margin-bottom:8px"><thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Desc%</th><th>Subtotal</th><th></th></tr></thead><tbody>${state.pedidoItems.map((it,i)=>`<tr><td>${it.name}</td><td>${it.qty} ${it.unit}</td><td>${fmt(it.price)}</td><td>${it.itemDiscount||0}%</td><td>${fmt(it.qty*it.price*(1-(it.itemDiscount||0)/100))}</td><td><button class="btn btn-ghost" style="padding:2px 6px;font-size:11px;color:var(--red)" onclick="pedidoRemItem(${i})">✕</button></td></tr>`).join("")}</tbody></table>`:"<p style='color:var(--muted);font-size:13px;text-align:center;padding:12px 0'>Nenhum item adicionado</p>";
  totEl.innerHTML=`<div style="text-align:right;font-size:13px;color:var(--muted)">Subtotal: <b style="color:var(--text)">${fmt(sub)}</b> &nbsp; Desconto: <b style="color:var(--red)">-${fmt(discAmt)}</b> &nbsp; Frete: <b style="color:var(--text)">+${fmt(freight)}</b> &nbsp; <span style="font-size:15px;font-weight:700;color:var(--amber)">Total: ${fmt(total)}</span></div>`;
}
async function salvarPedido(num, confirmar=false){
  if(!_guardSave()) return;
  if(!state.pedidoItems.length){ _doneSave(); alert("Adicione pelo menos um item ao pedido."); return; }
  const clientId=parseInt(el("ped-client").value)||0;
  const disc=parseFloat(el("ped-disc").value)||0;
  const freight=parseFloat(el("ped-freight").value)||0;
  const sub=pedidoGetSubtotal();
  const total=sub*(1-disc/100)+freight;
  const order={
    id:Date.now(), number:num,
    date:el("ped-date").value||today(),
    clientId, paymentTerms:el("ped-terms").value,
    discount:disc, freight, notes:el("ped-notes").value,
    items:[...state.pedidoItems],
    subtotal:sub, total,
    status:confirmar?"confirmado":"rascunho"
  };
  if(!state.orders) state.orders=[];
  state.orders.push(order);
  state.pedidoItems=[];
  await saveToFirebase(); _doneSave();
  closeModal(); renderPedidos();
  showSyncStatus(confirmar?"✓ Pedido confirmado":"✓ Pedido salvo como rascunho");
}
async function confirmarPedido(id){
  const o=state.orders.find(x=>x.id==id);
  if(!o) return;
  if(!confirm("Confirmar pedido "+o.number+"?")) return;
  o.status="confirmado";
  await saveToFirebase(); renderPedidos();
}
async function cancelarPedido(id){
  const o=state.orders.find(x=>x.id==id);
  if(!o) return;
  if(!confirm("Cancelar pedido "+o.number+"?")) return;
  o.status="cancelado";
  await saveToFirebase(); renderPedidos();
}
function editarPedidoModal(id){
  const o=state.orders.find(x=>x.id==id);
  if(!o) return;
  if(o.status!=="rascunho"&&o.status!=="confirmado"){ alert("Apenas pedidos em rascunho ou confirmado podem ser editados."); return; }
  state.pedidoItems=[...o.items];
  const clients=state.clients||[];
  openModal(`<div class="modal-title">Editar Pedido ${o.number}</div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Número</label>
        <input id="ped-num" class="form-input" value="${o.number}" readonly>
      </div>
      <div class="form-group"><label class="form-label">Data</label>
        <input id="ped-date" type="date" class="form-input" value="${o.date}">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Cliente</label>
      <select id="ped-client" class="form-input">
        <option value="">Selecione cliente...</option>
        ${clients.map(c=>`<option value="${c.id}" ${c.id==o.clientId?"selected":""}>${c.name}</option>`).join("")}
      </select>
    </div>
    <div class="form-grid-3">
      <div class="form-group"><label class="form-label">Condição de Pagamento</label>
        <select id="ped-terms" class="form-input">
          ${PAY_TERMS.map(t=>`<option ${t===o.paymentTerms?"selected":""}>${t}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Desconto Geral (%)</label>
        <input id="ped-disc" type="number" min="0" max="100" step="0.1" class="form-input" value="${o.discount||0}" oninput="pedidoRenderItems()">
      </div>
      <div class="form-group"><label class="form-label">Frete (R$)</label>
        <input id="ped-freight" type="number" min="0" step="0.01" class="form-input" value="${o.freight||0}" oninput="pedidoRenderItems()">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Observações</label>
      <textarea id="ped-notes" class="form-input" rows="2" style="resize:vertical">${(o.notes||"").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</textarea>
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">ITENS DO PEDIDO</div>
    <div style="margin-bottom:10px">
      <input id="ped-prod-search" class="form-input" style="width:100%;margin-bottom:6px" placeholder="🔍 Buscar produto pelo nome..." oninput="pedidoRenderProdList(this.value)" autocomplete="off">
      <div id="ped-prod-list" style="max-height:210px;overflow-y:auto;border:1px solid var(--border);border-radius:6px"></div>
    </div>
    <div id="ped-items-list"></div>
    <div id="ped-totals"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-ghost" onclick="salvarEditPedido('${o.id}')">Salvar Rascunho</button>
      <button class="btn btn-primary" onclick="salvarEditPedido('${o.id}',true)">Confirmar Pedido</button>
    </div>`,true);
  pedidoRenderItems();
  pedidoRenderProdList("");
}
async function salvarEditPedido(id,confirmar=false){
  if(!_guardSave()) return;
  if(!state.pedidoItems.length){ _doneSave(); alert("Adicione pelo menos um item ao pedido."); return; }
  const o=state.orders.find(x=>x.id==id);
  if(!o){ _doneSave(); return; }
  const clientId=parseInt(el("ped-client").value)||0;
  const disc=parseFloat(el("ped-disc").value)||0;
  const freight=parseFloat(el("ped-freight").value)||0;
  const sub=pedidoGetSubtotal();
  const total=sub*(1-disc/100)+freight;
  o.date=el("ped-date").value||today();
  o.clientId=clientId;
  o.paymentTerms=el("ped-terms").value;
  o.discount=disc; o.freight=freight;
  o.notes=el("ped-notes").value;
  o.items=[...state.pedidoItems];
  o.subtotal=sub; o.total=total;
  if(confirmar) o.status="confirmado";
  state.pedidoItems=[];
  await saveToFirebase(); _doneSave();
  closeModal(); renderPedidos();
  showSyncStatus(confirmar?"✓ Pedido confirmado":"✓ Pedido atualizado");
}
function faturarPedido(id){
  const o=state.orders.find(x=>x.id==id);
  if(!o) return;
  state.nfItems=o.items.map(it=>({productId:it.productId,qty:it.qty,price:it.price,itemDiscount:it.itemDiscount||0}));
  state.nfCosts=[];
  const clients=state.clients||[];
  const invoices=state.invoices||[];
  const nextNum="NF-"+String(invoices.length+1).padStart(4,"0");
  const obsVal=(o.notes||"").replace(/"/g,"&quot;");
  openModal(`<div class="modal-title">Emitir NF — Pedido ${o.number}</div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Número NF</label>
        <input id="nf-num" class="form-input" value="${nextNum}" readonly>
      </div>
      <div class="form-group"><label class="form-label">Data Emissão</label>
        <input id="nf-date" type="date" class="form-input" value="${today()}">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Cliente</label>
      <select id="nf-client" class="form-input">
        <option value="">Selecione cliente...</option>
        ${clients.map(c=>`<option value="${c.id}" ${c.id==o.clientId?"selected":""}>${c.name}</option>`).join("")}
      </select>
    </div>
    <div class="form-grid-3">
      <div class="form-group"><label class="form-label">Condição de Pagamento</label>
        <select id="nf-terms" class="form-input">
          ${PAY_TERMS.map(t=>`<option ${t===o.paymentTerms?"selected":""}>${t}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Desconto Geral (%)</label>
        <input id="nf-disc" type="number" min="0" max="100" step="0.1" class="form-input" value="${o.discount||0}" oninput="nfUpdateTotals()">
      </div>
      <div class="form-group"><label class="form-label">Frete no PDF (R$)</label>
        <input id="nf-freight" type="number" min="0" step="0.01" class="form-input" value="${o.freight||0}" oninput="nfUpdateTotals()">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Frete Interno (R$) <span class="text-muted" style="font-size:10px;font-weight:400">— não aparece no PDF</span></label>
        <input id="nf-freight-int" type="number" min="0" step="0.01" class="form-input" value="0">
      </div>
      <div class="form-group"><label class="form-label">Observações <span class="text-muted" style="font-size:10px;font-weight:400">— aparece no PDF</span></label>
        <input id="nf-obs" class="form-input" placeholder="Observações da nota..." value="${obsVal}">
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
      <button class="btn btn-primary" onclick="emitirNFdePedido('${nextNum}','${o.id}')">Emitir Nota</button>
    </div>`,true);
  nfRenderItems();
  nfRenderProdList("");
  nfRenderCosts();
}
async function emitirNFdePedido(nfNum, pedidoId){
  if(!_guardSave()) return;
  const clientId=parseInt(el("nf-client").value)||0;
  const terms=el("nf-terms").value;
  const disc=parseFloat(el("nf-disc").value)||0;
  const freight=parseFloat(el("nf-freight").value)||0;
  const freightInt=parseFloat(el("nf-freight-int")?.value)||0;
  const obs=(el("nf-obs")?.value||"").trim();
  const costs=[...(state.nfCosts||[])].filter(c=>c.description||c.value>0);
  const clientCosts=costs.filter(c=>c.clientPays).reduce((s,c)=>s+(parseFloat(c.value)||0),0);
  const date=el("nf-date").value||today();
  if(!state.nfItems.length){ _doneSave(); alert("Adicione pelo menos um item."); return; }
  const stockWarningsPed=state.nfItems.filter(it=>{const p=getProd(it.productId);return p&&p.stock<it.qty;});
  if(stockWarningsPed.length){
    const msg=stockWarningsPed.map(it=>{const p=getProd(it.productId);return `• ${p.name}: estoque ${p.stock}, pedido ${it.qty}`;}).join("\n");
    alert(`Estoque insuficiente. Não é possível emitir a nota:\n\n${msg}`);
    _doneSave(); return;
  }
  const sub=nfGetSubtotal();
  const total=parseFloat((sub*(1-disc/100)+freight+clientCosts).toFixed(2));
  const inv={id:Date.now(),number:nfNum,date,clientId,paymentTerms:terms,discount:disc,freight,items:[...state.nfItems],subtotal:sub,total,status:"emitida"};
  if(obs) inv.notes=obs;
  if(freightInt>0) inv.internalFreight=freightInt;
  if(costs.length) inv.costs=costs;
  state.invoices.push(inv);
  inv.items.forEach(it=>{
    const p=getProd(it.productId);
    if(p){ p.stock-=it.qty; if(p.stock<0) p.stock=0; }
  });
  if(!state.stockMovements) state.stockMovements=[];
  inv.items.forEach(it=>{ state.stockMovements.push({id:uid(),date,productId:it.productId,type:"saida",qty:it.qty,reason:"Venda",reference:nfNum}); });
  if(!state.receivables) state.receivables=[];
  const recs2=generateReceivables(inv.id,nfNum,clientId,total,date,terms);
  state.receivables.push(...recs2);
  if(freightInt>0){
    state.transactions.push({id:uid(),date,type:"saida",category:"Logística",description:`Frete interno — ${nfNum}`,amount:freightInt});
  }
  costs.filter(c=>!c.clientPays&&c.value>0).forEach(c=>{
    state.transactions.push({id:uid(),date,type:"saida",category:"Operacional",description:`${c.description||"Custo operacional"} — ${nfNum}`,amount:parseFloat(c.value)||0});
  });
  const o=state.orders.find(x=>x.id==pedidoId);
  if(o){ o.status="faturado"; o.invoiceId=inv.id; }
  state.nfItems=[];
  try{ await saveToFirebase(); closeModal(); filterNotas(); showSyncStatus("✓ NF emitida e pedido faturado"); }
  finally{ _doneSave(); }
}
function viewPedido(id){
  const o=state.orders.find(x=>x.id==id);
  if(!o) return;
  const c=getClient(o.clientId);
  const statusLabel={rascunho:"Rascunho",confirmado:"Confirmado",faturado:"Faturado",cancelado:"Cancelado"};
  openModal(`<div class="modal-title">Pedido ${o.number}</div>
    <div class="form-grid-2" style="margin-bottom:12px">
      <div><span class="text-muted">Data:</span> ${fmtDate(o.date)}</div>
      <div><span class="text-muted">Status:</span> ${statusLabel[o.status]||o.status}</div>
      <div><span class="text-muted">Cliente:</span> ${c?c.name:"—"}</div>
      <div><span class="text-muted">Pagamento:</span> ${o.paymentTerms||"—"}</div>
    </div>
    <table class="table" style="margin-bottom:12px">
      <thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Desc%</th><th>Total</th></tr></thead>
      <tbody>${o.items.map(it=>`<tr><td>${it.name||it.productId}</td><td>${it.qty} ${it.unit||""}</td><td>${fmt(it.price)}</td><td>${it.itemDiscount||0}%</td><td>${fmt(it.qty*it.price*(1-(it.itemDiscount||0)/100))}</td></tr>`).join("")}</tbody>
    </table>
    <div style="text-align:right;font-size:13px">
      Subtotal: <b>${fmt(o.subtotal)}</b> &nbsp;
      Desconto: <b style="color:var(--red)">-${fmt(o.subtotal*(o.discount||0)/100)}</b> &nbsp;
      Frete: <b>+${fmt(o.freight||0)}</b> &nbsp;
      <span style="font-size:15px;font-weight:700;color:var(--amber)">Total: ${fmt(o.total)}</span>
    </div>
    ${o.notes?`<div style="margin-top:12px;color:var(--muted);font-size:13px">Obs: ${o.notes}</div>`:""}
    ${o.status==="faturado"&&o.invoiceId?`<div style="margin-top:12px;padding:10px 12px;background:var(--bg2);border-radius:6px;border:1px solid var(--border);display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--muted)">Nota Fiscal emitida:</span><span class="badge" style="cursor:pointer;text-decoration:underline;background:var(--green);color:#fff" onclick="viewNF(${o.invoiceId})">${(state.invoices.find(x=>x.id==o.invoiceId)||{}).number||"Ver NF"} ↗</span></div>`:""}
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
    </div>`);
}
