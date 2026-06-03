// ─── PRINT NF ────────────────────────────────────────────────────────────────
function printNF(id){
  const n=state.invoices.find(x=>x.id===id);
  const client=getClient(n.clientId);
  const co=state.company;
  const recs=state.receivables.filter(r=>r.invoiceId===id);
  const w=window.open("","_blank","width=800,height=600");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${n.number}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#000;padding:20px;max-width:780px;margin:0 auto}
    h1{font-size:18px;margin:0 0 4px} h2{font-size:14px;margin:0 0 16px;color:#555}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:16px}
    .co-info{font-size:11px;color:#333;line-height:1.6}
    .nf-info{text-align:right}
    .section{margin-bottom:14px}
    .section-label{font-weight:bold;font-size:11px;text-transform:uppercase;color:#555;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#f0f0f0;padding:6px 10px;text-align:left;border:1px solid #ddd;font-size:11px}
    td{padding:6px 10px;border:1px solid #ddd}
    .totals{margin-top:12px;text-align:right}
    .totals table{width:220px;margin-left:auto}
    .total-final{font-weight:bold;font-size:14px;border-top:2px solid #000}
    .footer{margin-top:20px;padding-top:12px;border-top:1px solid #ccc;font-size:10px;color:#777}
    .parcelas{margin-top:14px}
  </style></head><body>
  <div class="header">
    <div><h1>${co.name||"Empresa"}</h1><div class="co-info">
      ${co.cnpj?"CNPJ: "+co.cnpj+"<br>":""}
      ${co.address?co.address+"<br>":""}
      ${co.city?co.city+(co.uf?" - "+co.uf:"")+"<br>":""}
      ${co.phone?"Tel: "+co.phone+"<br>":""}
      ${co.email?co.email+"<br>":""}
    </div></div>
    <div class="nf-info">
      <h2>${n.number}</h2>
      <div>Data: ${fmtDate(n.date)}</div>
      <div>Status: ${n.status.toUpperCase()}</div>
    </div>
  </div>
  <div class="section"><div class="section-label">Cliente</div>
    <b>${client?client.name:"—"}</b><br>
    ${client&&client.cnpj?"CNPJ: "+client.cnpj+"<br>":""}
    ${client&&client.city?client.city:""}
  </div>
  <div class="section"><div class="section-label">Itens</div>
  <table><thead><tr><th>#</th><th>Produto</th><th>Qtd</th><th>Preço Unit.</th><th>Desc.</th><th>Total</th></tr></thead><tbody>
  ${n.items.map((it,i)=>{const p=getProd(it.productId);const disc=it.itemDiscount||0;const t=it.qty*it.price*(1-disc/100);return`<tr><td>${i+1}</td><td>${p?p.name:"—"}</td><td>${it.qty} ${p?p.unit:""}</td><td>R$ ${fmtNum(it.price)}</td><td>${disc>0?disc+"%":"—"}</td><td>R$ ${fmtNum(t)}</td></tr>`}).join("")}
  </tbody></table></div>
  <div class="totals"><table>
    <tr><td>Subtotal</td><td>R$ ${fmtNum(n.subtotal)}</td></tr>
    ${n.discount>0?`<tr><td>Desconto (${n.discount}%)</td><td>- R$ ${fmtNum(n.subtotal*n.discount/100)}</td></tr>`:""}
    ${n.freight>0?`<tr><td>Frete</td><td>R$ ${fmtNum(n.freight)}</td></tr>`:""}
    ${(n.costs||[]).filter(c=>c.clientPays&&c.value>0).map(c=>`<tr><td>${c.description||"Custo"}</td><td>R$ ${fmtNum(c.value||0)}</td></tr>`).join("")}
    <tr class="total-final"><td><b>TOTAL</b></td><td><b>R$ ${fmtNum(n.total)}</b></td></tr>
  </table></div>
  ${n.notes?`<div class="section" style="margin-top:14px"><div class="section-label">Observações</div><div style="font-size:12px;color:#333;line-height:1.5">${n.notes}</div></div>`:""}
  <div class="parcelas"><div class="section-label">Condições de Pagamento: ${n.paymentTerms}</div>
  ${recs.length>1?`<table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>
  ${recs.map(r=>`<tr><td>${r.installment}/${r.total}</td><td>${fmtDate(r.dueDate)}</td><td>R$ ${fmtNum(r.amount)}</td><td>${r.status.toUpperCase()}</td></tr>`).join("")}
  </tbody></table>`:recs.length===1?`<div>Vencimento: ${fmtDate(recs[0].dueDate)} — R$ ${fmtNum(recs[0].amount)}</div>`:""}
  </div>
  <div class="footer">Documento gerado pelo sistema 2R Comércio em ${fmtDate(today())}</div>
</body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),500);
}
