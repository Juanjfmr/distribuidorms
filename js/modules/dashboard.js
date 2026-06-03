// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function renderDashboard(){
  const tIn=totalIn(), tOut=totalOut(), saldo=tIn-tOut;
  const totalVendas=state.invoices.filter(n=>n.status!=="cancelada").reduce((s,n)=>s+n.total,0);
  const lowStock=state.products.filter(p=>p.stock<=p.minStock);
  const overdueRec=state.receivables.filter(r=>r.status==="aberta"&&isOverdue(r.dueDate));
  const recentTx=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  const recentNF=[...state.invoices].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  el("content").innerHTML=`
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Saldo em Caixa</div><div class="kpi-value" style="color:${saldo>=0?"var(--green)":"var(--red)"}">${fmt(saldo)}</div><div class="kpi-sub">Entradas − Saídas</div></div>
      <div class="kpi"><div class="kpi-label">Total de Vendas</div><div class="kpi-value">${fmt(totalVendas)}</div><div class="kpi-sub">${state.invoices.filter(n=>n.status!=="cancelada").length} notas ativas</div></div>
      <div class="kpi"><div class="kpi-label">A Receber</div><div class="kpi-value text-amber">${fmt(state.receivables.filter(r=>r.status==="aberta").reduce((s,r)=>s+r.amount,0))}</div><div class="kpi-sub">${state.receivables.filter(r=>r.status==="aberta").length} parcelas em aberto</div></div>
      <div class="kpi"><div class="kpi-label">Vencidas</div><div class="kpi-value text-red">${fmt(overdueRec.reduce((s,r)=>s+r.amount,0))}</div><div class="kpi-sub">${overdueRec.length} parcela(s) vencida(s)</div></div>
    </div>
    ${lowStock.length?`<div class="alert-warn">⚠ Estoque baixo: ${lowStock.map(p=>p.name).join(", ")}</div>`:""}
    ${overdueRec.length?`<div class="alert-red">⚠ ${overdueRec.length} parcela(s) vencida(s) — <span style="cursor:pointer;text-decoration:underline" onclick="navigate('contas')">ver contas a receber</span></div>`:""}
    <div class="grid-2">
      <div class="card">
        <div class="section-title" style="margin-bottom:14px">Últimas Transações</div>
        ${recentTx.map(t=>`<div class="row-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div><div style="font-size:13px;color:var(--text2)">${t.description}</div><div class="text-muted" style="font-size:11px;margin-top:2px">${fmtDate(t.date)} · ${t.category}</div></div>
          <div class="mono fw-bold" style="color:${t.type==="entrada"?"var(--green)":"var(--red)"}">${t.type==="entrada"?"+":"−"}${fmt(t.amount)}</div>
        </div>`).join("")}
      </div>
      <div class="card">
        <div class="section-title" style="margin-bottom:14px">Últimas Notas</div>
        <table><thead><tr><th>Número</th><th>Data</th><th>Total</th><th>Status</th></tr></thead><tbody>
          ${recentNF.map(n=>`<tr class="${n.status==="cancelada"?"cancelled-row":""}">
            <td class="mono text-amber">${n.number}</td><td>${fmtDate(n.date)}</td>
            <td class="mono">${fmt(n.total)}</td>
            <td><span class="badge ${n.status==="paga"?"bg-green":n.status==="parcial"?"bg-blue":n.status==="cancelada"?"bg-gray":"bg-amber"}">${n.status}</span></td>
          </tr>`).join("")}
        </tbody></table>
      </div>
    </div>`;
}
