// ─── CLIENTES ────────────────────────────────────────────────────────────────
function renderClientes(){
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Clientes</div>
      <div class="row">
        <input id="cli-search" class="form-input" style="width:200px" placeholder="Buscar cliente..." oninput="filterClientes()">
        <button class="btn btn-primary" onclick="openClientModal()">+ Novo Cliente</button>
      </div>
    </div>
    <div class="card"><table><thead><tr><th>Nome</th><th>CNPJ/CPF</th><th>Cidade</th><th>Telefone</th><th>Limite Crédito</th><th>Situação</th><th></th></tr></thead>
    <tbody id="cli-tbody"></tbody></table></div>`;
  filterClientes();
}
function filterClientes(){
  const q=norm((el("cli-search")||{}).value||"");
  const tbody=el("cli-tbody"); if(!tbody) return;
  const list=state.clients.filter(c=>!q||norm(c.name).includes(q)||norm(c.cnpj).includes(q)||norm(c.city).includes(q));
  tbody.innerHTML=list.length?list.map(c=>{
    const openRecs=state.receivables.filter(r=>r.clientId===c.id&&r.status==="aberta");
    const openAmt=openRecs.reduce((s,r)=>s+r.amount,0);
    const overdue=openRecs.some(r=>isOverdue(r.dueDate));
    return`<tr>
      <td class="text-white fw-bold">${c.name}</td>
      <td class="mono">${c.cnpj||"—"}</td>
      <td>${c.city||"—"}</td><td>${c.phone||"—"}</td>
      <td class="mono">${fmt(c.creditLimit||0)}</td>
      <td><span class="badge ${overdue?"bg-red":openAmt>0?"bg-amber":"bg-green"}">${overdue?"Inadimplente":openAmt>0?"Em aberto: "+fmt(openAmt):"Em dia"}</span></td>
      <td><div class="row">
        <button class="btn-sm btn-amber" onclick="openClientModal(${c.id})">Editar</button>
        <button class="btn-sm" onclick="deleteClient(${c.id})">✕</button>
      </div></td>
    </tr>`;}).join(""):`<tr><td colspan="7" class="empty">Nenhum cliente encontrado.</td></tr>`;
}
function openClientModal(id){
  const c=id?state.clients.find(x=>x.id===id):null;
  showModal(`<div class="modal-title">${c?"Editar Cliente":"Novo Cliente"}</div>
    <div class="form-group"><label class="form-label">Nome / Razão Social</label><input id="fc-name" class="form-input" value="${c?c.name:""}"></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">CNPJ / CPF</label><input id="fc-cnpj" class="form-input" value="${c?c.cnpj||"":""}"></div>
      <div class="form-group"><label class="form-label">Cidade</label><input id="fc-city" class="form-input" value="${c?c.city||"":""}"></div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Telefone</label><input id="fc-phone" class="form-input" value="${c?c.phone||"":""}"></div>
      <div class="form-group"><label class="form-label">E-mail</label><input id="fc-email" class="form-input" value="${c?c.email||"":""}"></div>
    </div>
    <div class="form-group"><label class="form-label">Limite de Crédito (R$)</label><input id="fc-credit" class="form-input" type="number" step="0.01" value="${c?c.creditLimit||0:0}"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveClient(${id||""})">Salvar</button>
    </div>`);
}
function saveClient(id){
  const name=el("fc-name").value.trim();
  if(!name) return alert("Informe o nome.");
  const obj={name,cnpj:el("fc-cnpj").value,city:el("fc-city").value,phone:el("fc-phone").value,email:el("fc-email").value,creditLimit:parseFloat(el("fc-credit").value)||0};
  if(id) state.clients=state.clients.map(c=>c.id===id?{...obj,id}:c);
  else state.clients.push({...obj,id:uid()});
  saveState(); closeModal(); renderClientes();
  showSyncStatus(id?"✓ Cliente atualizado":"✓ Cliente cadastrado");
}
function deleteClient(id){
  const refs=[];
  if((state.invoices||[]).some(n=>n.clientId==id&&n.status!=="cancelada")) refs.push("notas fiscais");
  if((state.orders||[]).some(o=>o.clientId==id&&o.status!=="cancelado")) refs.push("pedidos");
  if((state.receivables||[]).some(r=>r.clientId==id&&r.status==="aberta")) refs.push("recebíveis em aberto");
  if(refs.length){ alert("Não é possível excluir: cliente possui "+refs.join(", ")+" vinculado(s)."); return; }
  if(confirm("Remover cliente?")){ state.clients=state.clients.filter(c=>c.id!==id); saveState(); renderClientes(); }
}
