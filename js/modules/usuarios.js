// ─── USUÁRIOS ────────────────────────────────────────────────────────────────
async function loadUsers() {
  try {
    const { collection, getDocs } = window._fbFns;
    const snap = await getDocs(collection(window._db, 'users'));
    const users = [];
    snap.forEach(d => users.push({uid: d.id, ...d.data()}));
    const myCompanyId = window._companyId;
    return myCompanyId ? users.filter(u => u.companyId === myCompanyId) : users;
  } catch(e) { return []; }
}

async function renderUsuarios() {
  if (window._userRole !== 'admin') { navigate('dashboard'); return; }
  el("content").innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">Carregando usuários...</div>`;
  const users = await loadUsers();
  el("content").innerHTML = `
    <div class="section-header">
      <div class="section-title">Gestão de Usuários</div>
      <button class="btn btn-primary" onclick="openNewUserModal()">+ Novo Usuário</button>
    </div>
    <div class="card"><table><thead><tr>
      <th>Nome</th><th>E-mail</th><th>Perfil</th><th>Criado em</th><th>Status</th><th></th>
    </tr></thead><tbody>
      ${users.map(u => {
        const isMe = window._currentUser && u.uid === window._currentUser.uid;
        return `<tr>
          <td class="text-white fw-bold">${u.name||'—'}${isMe?' <span class="badge bg-amber" style="font-size:10px">Você</span>':''}</td>
          <td class="mono">${u.email||'—'}</td>
          <td><span class="badge ${u.role==='admin'?'bg-amber':u.role==='vendedor'?'bg-blue':'bg-gray'}">${ROLE_LABELS[u.role]||u.role}</span></td>
          <td class="mono text-muted">${u.createdAt?fmtDate(u.createdAt.slice(0,10)):'—'}</td>
          <td><span class="badge ${u.active!==false?'bg-green':'bg-red'}">${u.active!==false?'Ativo':'Inativo'}</span></td>
          <td><div class="row">
            ${!isMe?`<button class="btn-sm btn-amber" onclick="openEditUserModal('${u.uid}','${u.name||''}','${u.email||''}','${u.role||'visualizador'}')">Editar</button>`:''}
            ${!isMe?`<button class="btn-sm btn-red" onclick="toggleUserActive('${u.uid}',${u.active!==false})">${u.active!==false?'Desativar':'Ativar'}</button>`:''}
          </div></td>
        </tr>`;
      }).join('')||`<tr><td colspan="6" class="empty">Nenhum usuário.</td></tr>`}
    </tbody></table></div>
    <div class="card" style="background:rgba(240,192,64,.05);border-color:rgba(240,192,64,.2)">
      <div class="section-title" style="margin-bottom:10px;font-size:14px">Níveis de Acesso</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:13px">
        <div><div class="badge bg-amber" style="margin-bottom:6px">Admin</div><div class="text-muted" style="font-size:12px">Acesso total — todas as telas, configurações e gestão de usuários.</div></div>
        <div><div class="badge bg-blue" style="margin-bottom:6px">Vendedor</div><div class="text-muted" style="font-size:12px">Produtos, clientes, notas, compras, contas e caixa. Sem config e usuários.</div></div>
        <div><div class="badge bg-gray" style="margin-bottom:6px">Visualizador</div><div class="text-muted" style="font-size:12px">Somente dashboard e relatórios. Sem edição.</div></div>
      </div>
    </div>`;
}

function openNewUserModal() {
  showModal(`
    <div class="modal-title">Novo Usuário</div>
    <div class="form-group"><label class="form-label">Nome</label><input id="nu-name" class="form-input" placeholder="Nome completo"></div>
    <div class="form-group"><label class="form-label">E-mail</label><input id="nu-email" class="form-input" type="email" placeholder="email@exemplo.com"></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Senha inicial</label><input id="nu-pass" class="form-input" type="password" placeholder="Mínimo 6 caracteres"></div>
      <div class="form-group"><label class="form-label">Perfil de acesso</label>
        <select id="nu-role" class="form-input">
          <option value="vendedor">Vendedor</option>
          <option value="admin">Admin</option>
          <option value="visualizador">Visualizador</option>
        </select>
      </div>
    </div>
    <div class="alert-warn" style="margin-top:4px">O usuário receberá o e-mail e senha para acessar o sistema. Oriente-o a trocar a senha após o primeiro acesso.</div>
    <div id="nu-err" class="alert-red" style="display:none"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="createNewUser()">Criar Usuário</button>
    </div>`);
}

async function createNewUser() {
  const name = el('nu-name').value.trim();
  const email = el('nu-email').value.trim();
  const pass = el('nu-pass').value;
  const role = el('nu-role').value;
  const errEl = el('nu-err');
  if (!name || !email || !pass) { errEl.style.display='block'; errEl.textContent='Preencha todos os campos.'; return; }
  if (pass.length < 6) { errEl.style.display='block'; errEl.textContent='A senha deve ter pelo menos 6 caracteres.'; return; }
  const btn = document.querySelector('#modal-box .btn-primary');
  btn.textContent='Criando...'; btn.disabled=true;
  try {
    const { createUserWithEmailAndPassword, initSecondaryApp } = window._fbFns;
    const { doc, setDoc } = window._fbFns;
    const secondaryApp = initSecondaryApp(window._firebaseConfig, 'secondary-'+Date.now());
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    const newUid = cred.user.uid;
    await secondaryAuth.signOut();
    await secondaryApp.delete();
    await setDoc(doc(window._db, 'users', newUid), { name, email, role, active: true, createdAt: new Date().toISOString(), companyId: window._companyId });
    closeModal();
    renderUsuarios();
    showSyncStatus('✓ Usuário criado');
  } catch(e) {
    errEl.style.display='block';
    errEl.textContent = e.code==='auth/email-already-in-use'?'Este e-mail já está cadastrado.':e.message;
    btn.textContent='Criar Usuário'; btn.disabled=false;
  }
}

function openEditUserModal(uid, name, email, role) {
  showModal(`
    <div class="modal-title">Editar Usuário</div>
    <div class="form-group"><label class="form-label">Nome</label><input id="eu-name" class="form-input" value="${name}"></div>
    <div class="form-group"><label class="form-label">E-mail</label><input class="form-input" value="${email}" disabled style="opacity:.5"></div>
    <div class="form-group"><label class="form-label">Perfil de acesso</label>
      <select id="eu-role" class="form-input">
        <option value="vendedor" ${role==='vendedor'?'selected':''}>Vendedor</option>
        <option value="admin" ${role==='admin'?'selected':''}>Admin</option>
        <option value="visualizador" ${role==='visualizador'?'selected':''}>Visualizador</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveUserEdit('${uid}')">Salvar</button>
    </div>`);
}

async function saveUserEdit(uid) {
  const name = el('eu-name').value.trim();
  const role = el('eu-role').value;
  const { doc, setDoc } = window._fbFns;
  const snap = await window._fbFns.getDoc(doc(window._db, 'users', uid));
  const existing = snap.exists() ? snap.data() : {};
  await setDoc(doc(window._db, 'users', uid), {...existing, name, role});
  closeModal(); renderUsuarios(); showSyncStatus('✓ Usuário atualizado');
}

async function toggleUserActive(uid, currentlyActive) {
  const action = currentlyActive ? 'desativar' : 'ativar';
  if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) return;
  const { doc, setDoc } = window._fbFns;
  const snap = await window._fbFns.getDoc(doc(window._db, 'users', uid));
  if (snap.exists()) {
    await setDoc(doc(window._db, 'users', uid), {...snap.data(), active: !currentlyActive});
  }
  renderUsuarios(); showSyncStatus(`✓ Usuário ${action}do`);
}
