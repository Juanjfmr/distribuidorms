// ─── CAIXA ───────────────────────────────────────────────────────────────────
function renderCaixa(){
  const filter=state.cashFilter||"todos";
  const dateFrom=(el("cx-from")||{}).value||"";
  const dateTo=(el("cx-to")||{}).value||"";
  const catFilter=(el("cx-cat")||{}).value||"";
  let txs=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  if(filter!=="todos") txs=txs.filter(t=>t.type===filter);
  if(dateFrom) txs=txs.filter(t=>t.date>=dateFrom);
  if(dateTo) txs=txs.filter(t=>t.date<=dateTo);
  if(catFilter) txs=txs.filter(t=>t.category===catFilter);
  const saldo=totalIn()-totalOut();
  const allCats=[...new Set(state.transactions.map(t=>t.category))].sort();
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Fluxo de Caixa</div>
      <button class="btn btn-primary" onclick="openTxModal()">+ Lançamento Manual</button>
    </div>
    <div class="kpi-grid-3" style="margin-bottom:16px">
      <div class="kpi"><div class="kpi-label">Entradas (total)</div><div class="kpi-value text-green">${fmt(totalIn())}</div></div>
      <div class="kpi"><div class="kpi-label">Saídas (total)</div><div class="kpi-value text-red">${fmt(totalOut())}</div></div>
      <div class="kpi"><div class="kpi-label">Saldo</div><div class="kpi-value" style="color:${saldo>=0?"var(--green)":"var(--red)"}">${fmt(saldo)}</div></div>
    </div>
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div class="row" style="flex-wrap:wrap;gap:12px">
        <div class="row" style="gap:8px">
          ${["todos","entrada","saida"].map(f=>`<button class="btn ${filter===f?"btn-primary":"btn-ghost"}" style="padding:6px 14px;font-size:12px" onclick="state.cashFilter='${f}';renderCaixa()">${f==="todos"?"Todos":f==="entrada"?"Entradas":"Saídas"}</button>`).join("")}
        </div>
        <div class="row" style="gap:8px;flex:1;flex-wrap:wrap">
          <input id="cx-from" type="date" class="form-input" style="width:140px" value="${dateFrom}" onchange="renderCaixa()" placeholder="De">
          <input id="cx-to" type="date" class="form-input" style="width:140px" value="${dateTo}" onchange="renderCaixa()" placeholder="Até">
          <select id="cx-cat" class="form-input" style="width:150px" onchange="renderCaixa()">
            <option value="">Todas categorias</option>
            ${allCats.map(c=>`<option${catFilter===c?" selected":""}>${c}</option>`).join("")}
          </select>
          <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px" onclick="clearCxFilters()">Limpar</button>
        </div>
      </div>
    </div>
    <div class="card"><table><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th></th></tr></thead><tbody>
      ${txs.map(t=>`<tr>
        <td class="mono">${fmtDate(t.date)}</td>
        <td><span class="badge ${t.type==="entrada"?"bg-green":"bg-red"}">${t.type}</span></td>
        <td>${t.category}</td>
        <td>${t.description}</td>
        <td class="mono fw-bold" style="color:${t.type==="entrada"?"var(--green)":"var(--red)"}">${t.type==="entrada"?"+":"−"}${fmt(t.amount)}</td>
        <td><button class="btn-sm btn-red" onclick="deleteTx(${t.id})">✕</button></td>
      </tr>`).join("")||`<tr><td colspan="6" class="empty">Nenhuma transação encontrada.</td></tr>`}
    </tbody></table></div>`;
}
function clearCxFilters(){ state.cashFilter="todos"; renderCaixa(); }
function openTxModal(){
  showModal(`<div class="modal-title">Novo Lançamento Manual</div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Tipo</label>
        <select id="tx-type" class="form-input" onchange="updateTxCats()">
          <option value="entrada">Entrada</option><option value="saida">Saída</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Data</label>
        <input id="tx-date" type="date" class="form-input" value="${today()}">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Categoria</label>
        <select id="tx-cat" class="form-input">
          ${CAT_FIN.entrada.map(c=>`<option>${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Valor (R$)</label>
        <input id="tx-val" type="number" step="0.01" class="form-input">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Descrição</label>
      <input id="tx-desc" class="form-input">
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveTx()">Salvar</button>
    </div>`);
}
function updateTxCats(){
  const t=el("tx-type").value;
  el("tx-cat").innerHTML=(CAT_FIN[t]||[]).map(c=>`<option>${c}</option>`).join("");
}
function saveTx(){
  const desc=el("tx-desc").value.trim();
  const val=parseFloat(el("tx-val").value);
  if(!desc||!val) return alert("Preencha descrição e valor.");
  state.transactions.push({id:uid(),date:el("tx-date").value,type:el("tx-type").value,category:el("tx-cat").value,description:desc,amount:val});
  saveState(); closeModal(); renderCaixa();
}
function deleteTx(id){ if(confirm("Remover este lançamento?")){ state.transactions=state.transactions.filter(t=>t.id!==id); saveState(); renderCaixa(); } }
