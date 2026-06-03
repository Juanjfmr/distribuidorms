// ─── CONFIG ──────────────────────────────────────────────────────────────────
function renderConfig(){
  const co=state.company||{};
  el("content").innerHTML=`
    <div class="section-title" style="margin-bottom:20px">Configurações da Empresa</div>
    <div class="card" style="max-width:580px">
      <div class="form-group"><label class="form-label">Nome / Razão Social</label><input id="cfg-name" class="form-input" value="${co.name||""}"></div>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">CNPJ</label><input id="cfg-cnpj" class="form-input" value="${co.cnpj||""}"></div>
        <div class="form-group"><label class="form-label">Telefone</label><input id="cfg-phone" class="form-input" value="${co.phone||""}"></div>
      </div>
      <div class="form-group"><label class="form-label">Endereço</label><input id="cfg-addr" class="form-input" value="${co.address||""}"></div>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Cidade</label><input id="cfg-city" class="form-input" value="${co.city||""}"></div>
        <div class="form-group"><label class="form-label">UF</label><input id="cfg-uf" class="form-input" value="${co.uf||"MS"}"></div>
      </div>
      <div class="form-group"><label class="form-label">E-mail</label><input id="cfg-email" class="form-input" value="${co.email||""}"></div>
      <button class="btn btn-primary" onclick="saveConfig()">Salvar Configurações</button>
    </div>
    <div class="card" style="max-width:580px;margin-top:0">
      <div class="section-title" style="margin-bottom:14px">Dados do Sistema</div>
      <div style="font-size:13px;color:var(--text2);line-height:2">
        Produtos: <b>${state.products.length}</b> &nbsp;·&nbsp;
        Clientes: <b>${state.clients.length}</b> &nbsp;·&nbsp;
        Fornecedores: <b>${state.suppliers.length}</b><br>
        Notas: <b>${state.invoices.length}</b> &nbsp;·&nbsp;
        Compras: <b>${state.purchases.length}</b> &nbsp;·&nbsp;
        Transações: <b>${state.transactions.length}</b>
      </div>
      <div style="margin-top:16px">
        <button class="btn btn-danger" onclick="exportData()">⬇ Exportar Dados (JSON)</button>
        &nbsp;
        <button class="btn btn-ghost" onclick="importData()">⬆ Importar Dados</button>
      </div>
      <div style="margin-top:12px">
        <button class="btn btn-danger" style="background:rgba(248,81,73,.08)" onclick="resetData()">⚠ Resetar todos os dados</button>
      </div>
    </div>`;
}
function saveConfig(){
  state.company={name:el("cfg-name").value,cnpj:el("cfg-cnpj").value,phone:el("cfg-phone").value,address:el("cfg-addr").value,city:el("cfg-city").value,uf:el("cfg-uf").value,email:el("cfg-email").value};
  saveState(); showSyncStatus("✓ Configurações salvas"); updateTopbar();
}
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`distribuidorms_backup_${today()}.json`; a.click();
}
function importData(){
  const inp=document.createElement("input"); inp.type="file"; inp.accept=".json";
  inp.onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{ try{ const d=JSON.parse(ev.target.result); Object.assign(state,d); state.nfItems=[]; state.compraItems=[]; saveState(); render(); alert("Dados importados!"); }catch(e){ alert("Arquivo inválido."); } };
    r.readAsText(f);
  }; inp.click();
}
async function resetData(){
  if(!confirm("ATENÇÃO: Apagar TODOS os dados e reiniciar com dados de exemplo?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = JSON.parse(JSON.stringify(defaultState));
  await saveToFirebase();
  render();
  alert("Dados resetados.");
}
