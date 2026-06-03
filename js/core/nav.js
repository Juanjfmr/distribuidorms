// ─── NAVIGATION ──────────────────────────────────────────────────────────────
const PAGE_TITLES={dashboard:"Dashboard",produtos:"Produtos",clientes:"Clientes",fornecedores:"Fornecedores",pedidos:"Pedidos de Venda",notas:"Nota Fiscal",devolucoes:"Devoluções",compras:"Compras",contas:"Contas",caixa:"Fluxo de Caixa",relatorios:"Relatórios",config:"Configurações"};

function navigate(v){
  state.currentView=v;
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===v));
  el("page-title").textContent=PAGE_TITLES[v]||v;
  render();
}
function render(){
  ({dashboard:renderDashboard,produtos:renderProdutos,clientes:renderClientes,fornecedores:renderFornecedores,pedidos:renderPedidos,notas:renderNotas,devolucoes:renderDevolucoes,compras:renderCompras,contas:renderContas,caixa:renderCaixa,relatorios:renderRelatorios,config:renderConfig,usuarios:renderUsuarios})[state.currentView]();
  applyRoleUI();
}

// ─── ROLES & NAV CONTROL ─────────────────────────────────────────────────────
var ROLE_NAV = {
  admin:        ['dashboard','produtos','clientes','fornecedores','pedidos','notas','devolucoes','compras','contas','caixa','relatorios','config','usuarios'],
  vendedor:     ['dashboard','produtos','clientes','fornecedores','pedidos','notas','devolucoes','compras','contas','caixa','relatorios'],
  visualizador: ['dashboard','relatorios'],
};
var ROLE_LABELS = { admin:'Admin', vendedor:'Vendedor', visualizador:'Visualizador' };
var ROLE_COLORS = { admin:'var(--amber)', vendedor:'var(--blue)', visualizador:'var(--muted)' };

function applyRoleUI() {
  const role = window._userRole || 'visualizador';
  const allowed = ROLE_NAV[role] || ROLE_NAV.visualizador;
  document.querySelectorAll('.nav-item[data-view]').forEach(n => {
    n.style.display = allowed.includes(n.dataset.view) ? '' : 'none';
  });
  const badge = document.getElementById('role-badge');
  if (badge) { badge.textContent = ROLE_LABELS[role]||role; badge.style.color = ROLE_COLORS[role]||'var(--muted)'; }
  if (role === 'visualizador') {
    document.querySelectorAll('.btn-primary, .btn-danger, .btn-sm.btn-red, .btn-sm.btn-amber').forEach(b => b.style.display='none');
  }
  if (!allowed.includes(state.currentView)) { navigate('dashboard'); }
}

// ─── SIDEBAR RESPONSIVA ──────────────────────────────────────────────────────
function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const ov=document.getElementById('sidebar-overlay');
  if(sb.classList.contains('open')){sb.classList.remove('open');ov.classList.remove('show');}
  else{sb.classList.add('open');ov.classList.add('show');}
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}
document.addEventListener('click',function(e){
  if(e.target.closest('.nav-item')) setTimeout(closeSidebar,50);
},true);
