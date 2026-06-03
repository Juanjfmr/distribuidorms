// ─── FORNECEDORES ────────────────────────────────────────────────────────────
function renderFornecedores(){
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Fornecedores</div>
      <div class="row">
        <input id="forn-search" class="form-input" style="width:200px" placeholder="Buscar fornecedor..." oninput="filterFornecedores()">
        <button class="btn btn-primary" onclick="openSupplierModal()">+ Novo Fornecedor</button>
      </div>
    </div>
    <div class="card"><table><thead><tr><th>Nome</th><th>CNPJ</th><th>Cidade</th><th>Contato</th><th>Prazo Pagamento</th><th>Compras</th><th></th></tr></thead>
    <tbody id="forn-tbody"></tbody></table></div>`;
  filterFornecedores();
}
function filterFornecedores(){
  const q=norm((el("forn-search")||{}).value||"");
  const tbody=el("forn-tbody"); if(!tbody) return;
  const list=state.suppliers.filter(s=>!q||norm(s.name).includes(q)||norm(s.cnpj).includes(q)||norm(s.city).includes(q)||norm(s.contact).includes(q));
  tbody.innerHTML=list.length?list.map(s=>{
    const comps=state.purchases.filter(p=>p.supplierId===s.id);
    const vol=comps.reduce((a,c)=>a+c.total,0);
    return`<tr>
      <td class="text-white fw-bold">${s.name}</td>
      <td class="mono">${s.cnpj||"—"}</td>
      <td>${s.city||"—"}</td>
      <td>${s.contact||"—"}</td>
      <td><span class="badge bg-blue">${s.paymentDays?(/^\d/.test(s.paymentDays)?s.paymentDays+" dias":s.paymentDays):"—"}</span></td>
      <td class="mono">${comps.length} · ${fmt(vol)}</td>
      <td><div class="row">
        <button class="btn-sm btn-amber" onclick="openSupplierModal(${s.id})">Editar</button>
        <button class="btn-sm btn-red" onclick="deleteSupplier(${s.id})">✕</button>
      </div></td>
    </tr>`;}).join(""):`<tr><td colspan="7" class="empty">Nenhum fornecedor encontrado.</td></tr>`;
}
function openSupplierModal(id){
  const s=id?state.suppliers.find(x=>x.id===id):null;
  showModal(`<div class="modal-title">${s?"Editar Fornecedor":"Novo Fornecedor"}</div>
    <div class="form-group"><label class="form-label">Nome / Razão Social</label><input id="fs-name" class="form-input" value="${s?s.name:""}"></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">CNPJ</label><input id="fs-cnpj" class="form-input" value="${s?s.cnpj||"":""}"></div>
      <div class="form-group"><label class="form-label">Cidade</label><input id="fs-city" class="form-input" value="${s?s.city||"":""}"></div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Telefone</label><input id="fs-phone" class="form-input" value="${s?s.phone||"":""}"></div>
      <div class="form-group"><label class="form-label">Contato</label><input id="fs-contact" class="form-input" value="${s?s.contact||"":""}"></div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">E-mail</label><input id="fs-email" class="form-input" value="${s?s.email||"":""}"></div>
      <div class="form-group"><label class="form-label">Prazo Pagamento (dias)</label>
        <select id="fs-pay" class="form-input">
          ${["30","30/60","30/60/90","À Vista"].map(v=>`<option${s&&s.paymentDays===v?" selected":""}>${v}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveSupplier(${id||""})">Salvar</button>
    </div>`);
}
function saveSupplier(id){
  const name=el("fs-name").value.trim();
  if(!name) return alert("Informe o nome.");
  const obj={name,cnpj:el("fs-cnpj").value,city:el("fs-city").value,phone:el("fs-phone").value,contact:el("fs-contact").value,email:el("fs-email").value,paymentDays:el("fs-pay").value};
  if(id) state.suppliers=state.suppliers.map(s=>s.id===id?{...obj,id}:s);
  else state.suppliers.push({...obj,id:uid()});
  saveState(); closeModal(); renderFornecedores();
  showSyncStatus(id?"✓ Fornecedor atualizado":"✓ Fornecedor cadastrado");
}
function deleteSupplier(id){
  const refs=[];
  if((state.purchases||[]).some(p=>p.supplierId==id&&p.status!=="cancelada")) refs.push("compras");
  if((state.payables||[]).some(p=>p.supplierId==id&&p.status==="a pagar")) refs.push("pagamentos em aberto");
  if(refs.length){ alert("Não é possível excluir: fornecedor possui "+refs.join(", ")+" vinculado(s)."); return; }
  if(confirm("Remover fornecedor?")){ state.suppliers=state.suppliers.filter(s=>s.id!==id); saveState(); renderFornecedores(); }
}
