// ─── RELATÓRIOS ──────────────────────────────────────────────────────────────
function getRelPeriod(){
  const val=state.relPeriod||"all";
  if(val==="all") return {label:"Todo o período",filter:()=>true};
  const [y,m]=val.split("-");
  return {label:`${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(m)-1]}/${y}`,
    filter:d=>d&&d.startsWith(y+"-"+m)};
}
function renderRelatorios(){
  if(state.relTab==="abc"){ renderCurvaABC(); return; }
  if(state.relTab==="nf"){ renderRelatorioNF(); return; }
  const {label,filter}=getRelPeriod();
  const filteredInv=state.invoices.filter(n=>n.status!=="cancelada"&&filter(n.date));
  const filteredTx=state.transactions.filter(t=>filter(t.date));
  const tIn=filteredTx.filter(t=>t.type==="entrada").reduce((s,t)=>s+t.amount,0);
  const tOut=filteredTx.filter(t=>t.type==="saida").reduce((s,t)=>s+t.amount,0);
  const totalSales=filteredInv.reduce((s,n)=>s+n.total,0);
  const margem=tIn>0?((tIn-tOut)/tIn*100):0;
  const months=new Set();
  state.invoices.forEach(n=>{ if(n.date) months.add(n.date.slice(0,7)); });
  state.transactions.forEach(t=>{ if(t.date) months.add(t.date.slice(0,7)); });
  const sortedMonths=[...months].sort().reverse();
  const byCat={};
  filteredTx.filter(t=>t.type==="saida").forEach(t=>{ byCat[t.category]=(byCat[t.category]||0)+t.amount; });
  const catArr=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const maxCat=catArr[0]?.[1]||1;
  const byProd={};
  filteredInv.forEach(n=>n.items.forEach(it=>{byProd[it.productId]=(byProd[it.productId]||0)+(it.qty*it.price*(1-(it.itemDiscount||0)/100));}));
  const topProds=Object.entries(byProd).map(([id,v])=>({p:getProd(parseInt(id)),v})).filter(x=>x.p).sort((a,b)=>b.v-a.v).slice(0,8);
  const maxProd=topProds[0]?.v||1;
  const filteredPurch=state.purchases.filter(p=>filter(p.date));
  const bySup={};
  filteredPurch.forEach(c=>{ bySup[c.supplierId]=(bySup[c.supplierId]||0)+c.total; });
  const supArr=Object.entries(bySup).map(([id,v])=>({s:getSupplier(parseInt(id)),v})).filter(x=>x.s).sort((a,b)=>b.v-a.v);
  const maxSup=supArr[0]?.v||1;
  const monthlyData=[];
  for(let i=5;i>=0;i--){
    const d=new Date(); d.setMonth(d.getMonth()-i);
    const ym=d.toISOString().slice(0,7);
    const mLabel=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][d.getMonth()];
    const sales=state.invoices.filter(n=>n.status!=="cancelada"&&n.date&&n.date.startsWith(ym)).reduce((s,n)=>s+n.total,0);
    const costs=state.transactions.filter(t=>t.type==="saida"&&t.date&&t.date.startsWith(ym)).reduce((s,t)=>s+t.amount,0);
    monthlyData.push({label:`${mLabel}/${d.getFullYear().toString().slice(2)}`,sales,costs});
  }
  const maxMonth=Math.max(...monthlyData.map(m=>Math.max(m.sales,m.costs)),1);
  const overdueRec=state.receivables.filter(r=>r.status==="aberta"&&isOverdue(r.dueDate));
  const delinqClients={};
  overdueRec.forEach(r=>{ if(!delinqClients[r.clientId]) delinqClients[r.clientId]={client:getClient(r.clientId),amount:0,count:0,oldest:r.dueDate}; delinqClients[r.clientId].amount+=r.amount; delinqClients[r.clientId].count++; if(r.dueDate<delinqClients[r.clientId].oldest) delinqClients[r.clientId].oldest=r.dueDate; });
  const delinqArr=Object.values(delinqClients).sort((a,b)=>b.amount-a.amount);
  const marginProds=state.products.map(p=>{
    const m=p.costPrice>0?((p.salePrice-p.costPrice)/p.salePrice*100):null;
    return{...p,margin:m};
  }).sort((a,b)=>(b.margin||0)-(a.margin||0));
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Relatórios Financeiros</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">
        <div class="tabs" style="margin-bottom:0;border-bottom:none">
          <div class="tab ${state.relTab==="geral"?"active":""}" onclick="state.relTab='geral';renderRelatorios()">Visão Geral</div>
          <div class="tab ${state.relTab==="abc"?"active":""}" onclick="state.relTab='abc';renderRelatorios()">Curva ABC</div>
          <div class="tab ${state.relTab==="nf"?"active":""}" onclick="state.relTab='nf';state.relNfId=null;renderRelatorios()">Por NF</div>
        </div>
        <span class="text-muted" style="font-size:13px">Período:</span>
        <select class="form-input" style="width:160px" onchange="state.relPeriod=this.value;renderRelatorios()">
          <option value="all" ${state.relPeriod==="all"?"selected":""}>Todo o período</option>
          ${sortedMonths.map(m=>{const [y,mo]=m.split("-");const ml=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][parseInt(mo)-1];return`<option value="${m}" ${state.relPeriod===m?"selected":""}>${ml}/${y}</option>`;}).join("")}
        </select>
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" onclick="window.print()" title="Imprimir relatório">🖨 Imprimir</button>
      </div>
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Vendas</div><div class="kpi-value">${fmt(totalSales)}</div><div class="kpi-sub">${filteredInv.length} notas — ${label}</div></div>
      <div class="kpi"><div class="kpi-label">Receitas</div><div class="kpi-value text-green">${fmt(tIn)}</div></div>
      <div class="kpi"><div class="kpi-label">Despesas</div><div class="kpi-value text-red">${fmt(tOut)}</div></div>
      <div class="kpi"><div class="kpi-label">Margem</div><div class="kpi-value" style="color:${margem>=20?"var(--green)":margem>=10?"var(--amber)":"var(--red)"}">${margem.toFixed(1)}%</div></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="section-title" style="margin-bottom:16px">Evolução Mensal — Últimos 6 Meses</div>
      <div style="display:flex;align-items:flex-end;gap:8px;height:120px;padding-bottom:8px;border-bottom:1px solid var(--border)">
        ${monthlyData.map(m=>`
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%">
            <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;width:100%">
              <div title="Vendas: ${fmt(m.sales)}" style="width:100%;background:var(--amber);opacity:.8;border-radius:2px 2px 0 0;height:${(m.sales/maxMonth*100).toFixed(0)}%;min-height:${m.sales>0?3:0}px"></div>
            </div>
            <div style="font-size:10px;color:var(--muted);text-align:center;white-space:nowrap">${m.label}</div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;margin-right:6px">
            <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;width:100%">
              <div title="Despesas: ${fmt(m.costs)}" style="width:100%;background:var(--red);opacity:.7;border-radius:2px 2px 0 0;height:${(m.costs/maxMonth*100).toFixed(0)}%;min-height:${m.costs>0?3:0}px"></div>
            </div>
            <div style="font-size:10px;color:transparent">x</div>
          </div>`).join("")}
      </div>
      <div class="row" style="margin-top:8px;gap:16px">
        <div class="row" style="gap:6px"><div style="width:12px;height:12px;background:var(--amber);border-radius:2px;opacity:.8"></div><span style="font-size:12px;color:var(--muted)">Vendas</span></div>
        <div class="row" style="gap:6px"><div style="width:12px;height:12px;background:var(--red);border-radius:2px;opacity:.7"></div><span style="font-size:12px;color:var(--muted)">Despesas</span></div>
      </div>
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="section-title" style="margin-bottom:14px">Saídas por Categoria</div>
        ${catArr.length?catArr.map(([cat,val])=>`<div class="bar-wrap">
          <div class="bar-info"><span style="color:var(--text2)">${cat}</span><span class="mono text-red">${fmt(val)}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(val/maxCat*100).toFixed(1)}%;background:var(--red);opacity:.8"></div></div>
        </div>`).join(""):`<div class="empty">Sem dados no período.</div>`}
      </div>
      <div class="card">
        <div class="section-title" style="margin-bottom:14px">Top Produtos Vendidos</div>
        ${topProds.length?topProds.map(({p,v})=>`<div class="bar-wrap">
          <div class="bar-info"><span style="color:var(--text2);font-size:12px">${p.name}</span><span class="mono text-amber">${fmt(v)}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(v/maxProd*100).toFixed(1)}%;background:var(--amber);opacity:.8"></div></div>
        </div>`).join(""):`<div class="empty">Sem vendas no período.</div>`}
      </div>
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="section-title" style="margin-bottom:14px">Compras por Fornecedor</div>
        ${supArr.length?supArr.map(({s,v})=>`<div class="bar-wrap">
          <div class="bar-info"><span style="color:var(--text2)">${s.name}</span><span class="mono text-red">${fmt(v)}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(v/maxSup*100).toFixed(1)}%;background:var(--blue);opacity:.8"></div></div>
        </div>`).join(""):`<div class="empty">Sem compras no período.</div>`}
      </div>
      <div class="card">
        <div class="section-title" style="margin-bottom:14px">Margem por Produto</div>
        <table><thead><tr><th>Produto</th><th>Custo</th><th>Venda</th><th>Margem</th></tr></thead><tbody>
          ${marginProds.slice(0,8).map(p=>{const m=p.margin;return`<tr>
            <td style="font-size:12px">${p.name}</td>
            <td class="mono">${fmt(p.costPrice||0)}</td>
            <td class="mono">${fmt(p.salePrice)}</td>
            <td class="mono" style="color:${m===null?"var(--muted)":m>=30?"var(--green)":m>=15?"var(--amber)":"var(--red)"};font-weight:600">${m===null?"—":m.toFixed(1)+"%"}</td>
          </tr>`}).join("")}
        </tbody></table>
      </div>
    </div>
    ${delinqArr.length?`<div class="card">
      <div class="section-title" style="margin-bottom:14px">⚠ Inadimplência</div>
      <table><thead><tr><th>Cliente</th><th>Parcelas vencidas</th><th>Total em atraso</th><th>Mais antiga</th></tr></thead><tbody>
        ${delinqArr.map(({client:c,amount,count,oldest})=>`<tr>
          <td class="text-white fw-bold">${c?c.name:"—"}</td>
          <td class="mono text-red">${count}</td>
          <td class="mono fw-bold text-red">${fmt(amount)}</td>
          <td class="mono">${fmtDate(oldest)}</td>
        </tr>`).join("")}
      </tbody></table>
    </div>`:""}`;
}

// ─── RELATÓRIO POR NF ────────────────────────────────────────────────────────
function renderRelatorioNF(){
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Relatórios Financeiros</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">
        <div class="tabs" style="margin-bottom:0;border-bottom:none">
          <div class="tab" onclick="state.relTab='geral';renderRelatorios()">Visão Geral</div>
          <div class="tab" onclick="state.relTab='abc';renderRelatorios()">Curva ABC</div>
          <div class="tab active">Por NF</div>
        </div>
      </div>
    </div>
    <div class="grid-2" style="gap:16px;align-items:start">
      <div class="card">
        <div class="section-title" style="margin-bottom:12px">Notas Fiscais</div>
        <input id="rel-nf-search" class="form-input" style="margin-bottom:10px;width:100%" placeholder="🔍 Buscar por número ou cliente..." oninput="filterRelNF()">
        <div id="rel-nf-list" style="max-height:520px;overflow-y:auto"></div>
      </div>
      <div id="rel-nf-detail">
        <div class="card" style="text-align:center;padding:40px 20px;color:var(--muted)">
          <div style="font-size:36px;margin-bottom:10px">📋</div>
          <div>Selecione uma nota à esquerda para ver o relatório completo</div>
        </div>
      </div>
    </div>`;
  filterRelNF();
  if(state.relNfId){
    const nf=state.invoices.find(n=>n.id===state.relNfId);
    if(nf) renderRelNFDetail(nf);
  }
}
function filterRelNF(){
  const listEl=el("rel-nf-list"); if(!listEl) return;
  const q=norm((el("rel-nf-search")||{value:""}).value);
  const filtered=[...state.invoices].filter(n=>{
    const c=getClient(n.clientId);
    return !q||norm(n.number).includes(q)||(c&&norm(c.name).includes(q));
  }).sort((a,b)=>b.date.localeCompare(a.date));
  listEl.innerHTML=filtered.length?filtered.map(n=>{
    const c=getClient(n.clientId);
    const sel=state.relNfId===n.id;
    const statusColor={paga:"bg-green",parcial:"bg-blue",emitida:"bg-amber",cancelada:"bg-gray"}[n.status]||"bg-gray";
    return`<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:6px;cursor:pointer;background:${sel?"var(--bg3)":"var(--bg2)"};border:1px solid ${sel?"var(--amber)":"var(--border)"};margin-bottom:6px"
      onclick="state.relNfId=${n.id};filterRelNF();renderRelNFDetail(state.invoices.find(x=>x.id===${n.id}))">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${n.number} <span class="text-muted" style="font-size:11px">· ${fmtDate(n.date)}</span></div>
        <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c?c.name:"—"}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="mono" style="font-size:13px;color:var(--amber)">${fmt(n.total)}</div>
        <span class="badge ${statusColor}" style="font-size:10px">${n.status}</span>
      </div>
    </div>`;
  }).join(""):`<div class="empty">Nenhuma NF encontrada.</div>`;
}
function renderRelNFDetail(nf){
  const detailEl=el("rel-nf-detail"); if(!detailEl||!nf) return;
  const c=getClient(nf.clientId);
  const recs=state.receivables.filter(r=>r.invoiceId===nf.id);
  let totalCost=0, hasMissingCost=false;
  const items=nf.items.map(it=>{
    const p=getProd(it.productId);
    const disc=it.itemDiscount||0;
    const saleTotal=it.qty*it.price*(1-disc/100);
    const unitCost=p?.costPrice||0;
    if(!unitCost) hasMissingCost=true;
    const costTotal=it.qty*unitCost;
    totalCost+=costTotal;
    return{...it,p,saleTotal,unitCost,costTotal,profit:saleTotal-costTotal};
  });
  const internalFreight=nf.internalFreight||0;
  const nonClientCosts=(nf.costs||[]).filter(c=>!c.clientPays).reduce((s,c)=>s+(c.value||0),0);
  const profit=nf.total-totalCost-internalFreight-nonClientCosts;
  const margin=nf.total>0?(profit/nf.total*100):0;
  const statusColor={paga:"bg-green",parcial:"bg-blue",emitida:"bg-amber",cancelada:"bg-gray"}[nf.status]||"bg-gray";
  detailEl.innerHTML=`
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:18px;font-weight:700;color:var(--text)">${nf.number}</div>
          <div style="font-size:13px;color:var(--muted)">${fmtDate(nf.date)} · ${c?c.name:"—"} · ${nf.paymentTerms}</div>
        </div>
        <div class="row">
          <span class="badge ${statusColor}">${nf.status}</span>
          <button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" onclick="printNF(${nf.id})">🖨 PDF</button>
        </div>
      </div>
      <div style="overflow-x:auto;margin-bottom:16px">
        <table>
          <thead><tr>
            <th>Produto</th><th>Qtd</th><th>Venda Unit.</th><th>Custo Unit.</th><th>Total Venda</th><th>Total Custo</th><th style="color:var(--green)">Lucro</th>
          </tr></thead>
          <tbody>
            ${items.map(it=>`<tr>
              <td style="font-size:12px">${it.p?it.p.name:"—"}${it.itemDiscount>0?` <span class="badge bg-amber" style="font-size:10px">${it.itemDiscount}% desc</span>`:""}</td>
              <td class="mono">${it.qty}</td>
              <td class="mono">${fmt(it.price)}</td>
              <td class="mono">${it.unitCost?fmt(it.unitCost):`<span class="text-muted">—</span>`}</td>
              <td class="mono text-amber">${fmt(it.saleTotal)}</td>
              <td class="mono text-red">${it.unitCost?fmt(it.costTotal):`<span class="text-muted">—</span>`}</td>
              <td class="mono fw-bold" style="color:${it.unitCost?(it.profit>=0?"var(--green)":"var(--red)"):"var(--muted)"}">${it.unitCost?fmt(it.profit):"—"}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="kpi-grid-2" style="margin-bottom:16px">
        <div class="kpi"><div class="kpi-label">Total da NF</div><div class="kpi-value text-amber">${fmt(nf.total)}</div>${nf.discount>0?`<div class="kpi-sub">Desc. ${nf.discount}% · Frete ${fmt(nf.freight||0)}</div>`:""}</div>
        <div class="kpi"><div class="kpi-label">Custo Total</div><div class="kpi-value text-red">${fmt(totalCost+(internalFreight||0)+(nonClientCosts||0))}</div>${hasMissingCost?`<div class="kpi-sub" style="color:var(--amber)">⚠ Produto(s) sem custo ignorados</div>`:""}<div class="kpi-sub">${internalFreight>0?`Frete int. ${fmt(internalFreight)}`:""}${nonClientCosts>0?` · Custos op. ${fmt(nonClientCosts)}`:""}</div></div>
        <div class="kpi"><div class="kpi-label">Lucro Bruto</div><div class="kpi-value" style="color:${profit>=0?"var(--green)":"var(--red)"}">${fmt(profit)}</div></div>
        <div class="kpi"><div class="kpi-label">Margem</div><div class="kpi-value" style="color:${margin>=30?"var(--green)":margin>=15?"var(--amber)":"var(--red)"}">${margin.toFixed(1)}%</div></div>
      </div>
      ${recs.length?`
        <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:8px;letter-spacing:.06em">PARCELAS</div>
        <table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>
          ${recs.map(r=>`<tr>
            <td class="mono">${r.installment}/${r.total}</td>
            <td class="mono ${isOverdue(r.dueDate)&&r.status==="aberta"?"text-red":""}">${fmtDate(r.dueDate)}${isOverdue(r.dueDate)&&r.status==="aberta"?" ⚠":""}</td>
            <td class="mono">${fmt(r.amount)}</td>
            <td><span class="badge ${r.status==="paga"?"bg-green":r.status==="cancelada"?"bg-gray":"bg-amber"}">${r.status}</span></td>
          </tr>`).join("")}
        </tbody></table>`:""}
    </div>`;
}

// ─── CURVA ABC ────────────────────────────────────────────────────────────────
function renderCurvaABC(){
  const {label,filter}=getRelPeriod();
  const filteredInv=state.invoices.filter(n=>n.status!=="cancelada"&&filter(n.date));
  const byProd={};
  filteredInv.forEach(n=>n.items.forEach(it=>{
    const key=it.productId;
    if(!byProd[key]) byProd[key]={productId:key,revenue:0,qty:0};
    const val=it.qty*it.price*(1-(it.itemDiscount||0)/100);
    byProd[key].revenue+=val;
    byProd[key].qty+=it.qty;
  }));
  const arr=Object.values(byProd).sort((a,b)=>b.revenue-a.revenue);
  const totalRev=arr.reduce((s,x)=>s+x.revenue,0);
  let cumul=0;
  arr.forEach(x=>{
    x.percent=totalRev>0?(x.revenue/totalRev*100):0;
    cumul+=x.percent;
    x.cumulative=cumul;
    x.curve=x.cumulative<=80?"A":x.cumulative<=95?"B":"C";
  });
  const months=new Set();
  state.invoices.forEach(n=>{if(n.date) months.add(n.date.slice(0,7));});
  state.transactions&&state.transactions.forEach(t=>{if(t.date) months.add(t.date.slice(0,7));});
  const sortedMonths=[...months].sort().reverse();
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Relatórios — Curva ABC</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">
        <div class="tabs" style="margin-bottom:0;border-bottom:none">
          <div class="tab ${state.relTab==="geral"?"active":""}" onclick="state.relTab='geral';renderRelatorios()">Visão Geral</div>
          <div class="tab ${state.relTab==="abc"?"active":""}" onclick="state.relTab='abc';renderRelatorios()">Curva ABC</div>
          <div class="tab ${state.relTab==="nf"?"active":""}" onclick="state.relTab='nf';state.relNfId=null;renderRelatorios()">Por NF</div>
        </div>
        <span class="text-muted" style="font-size:13px">Período:</span>
        <select class="form-input" style="width:160px" onchange="state.relPeriod=this.value;renderRelatorios()">
          <option value="all" ${state.relPeriod==="all"?"selected":""}>Todo o período</option>
          ${sortedMonths.map(m=>{const [y,mo]=m.split("-");const ml=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][parseInt(mo)-1];return`<option value="${m}" ${state.relPeriod===m?"selected":""}>${ml}/${y}</option>`;}).join("")}
        </select>
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" onclick="window.print()" title="Imprimir relatório">🖨 Imprimir</button>
      </div>
    </div>
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><div class="kpi-label">Classe A</div><div class="kpi-value" style="color:var(--green)">${arr.filter(x=>x.curve==="A").length} produtos</div><div class="kpi-sub">≤80% da receita</div></div>
      <div class="kpi"><div class="kpi-label">Classe B</div><div class="kpi-value" style="color:var(--amber)">${arr.filter(x=>x.curve==="B").length} produtos</div><div class="kpi-sub">80–95% da receita</div></div>
      <div class="kpi"><div class="kpi-label">Classe C</div><div class="kpi-value" style="color:var(--muted)">${arr.filter(x=>x.curve==="C").length} produtos</div><div class="kpi-sub">>95% da receita</div></div>
    </div>
    <div class="card" style="overflow-x:auto">
      <table class="table">
        <thead><tr><th>#</th><th>Produto</th><th>Receita</th><th>% Receita</th><th>% Acumulado</th><th>Qtd Vendida</th><th>Classe</th></tr></thead>
        <tbody>${arr.length?arr.map((x,i)=>{
          const p=getProd(x.productId);
          const colorMap={A:"var(--green)",B:"var(--amber)",C:"var(--muted)"};
          return `<tr>
            <td style="color:var(--muted)">${i+1}</td>
            <td>${p?p.name:x.productId}</td>
            <td>${fmt(x.revenue)}</td>
            <td>${x.percent.toFixed(1)}%</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;height:6px;background:var(--bg2);border-radius:3px;min-width:60px">
                  <div style="height:100%;background:${colorMap[x.curve]};border-radius:3px;width:${Math.min(x.cumulative,100)}%"></div>
                </div>
                <span style="min-width:40px;text-align:right">${x.cumulative.toFixed(1)}%</span>
              </div>
            </td>
            <td>${x.qty}</td>
            <td><span class="badge" style="background:${colorMap[x.curve]}22;color:${colorMap[x.curve]};font-weight:700">${x.curve}</span></td>
          </tr>`;
        }).join(""):`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px">Nenhuma venda no período selecionado</td></tr>`}
        </tbody>
      </table>
    </div>`;
}
