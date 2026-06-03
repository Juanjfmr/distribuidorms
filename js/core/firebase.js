// ─── FIREBASE SYNC ────────────────────────────────────────────────────────────

const _COLS = ['products','clients','suppliers','invoices','purchases',
               'receivables','payables','transactions','stockMovements','orders','returns'];

if (!window._lastSaved) window._lastSaved = {};

async function saveToFirebase() {
  try {
    const db = window._db;
    const { doc, setDoc, writeBatch } = window._fbFns;
    const companyId = window._companyId || (window._currentUser ? window._currentUser.uid : 'default');

    await setDoc(doc(db, 'empresas', companyId), {
      company: state.company,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    let batch = writeBatch(db);
    let opCount = 0;

    const flush = async () => {
      if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
    };

    for (const colName of _COLS) {
      const items = state[colName] || [];
      const prevSnap = window._lastSaved[colName] || {};
      const currentIds = new Set();

      for (const item of items) {
        const id = String(item.id);
        currentIds.add(id);
        const json = JSON.stringify(item);
        if (prevSnap[id] !== json) {
          batch.set(doc(db, 'empresas', companyId, colName, id), item);
          opCount++;
          if (opCount >= 490) await flush();
        }
        prevSnap[id] = json;
      }

      for (const prevId of Object.keys(prevSnap)) {
        if (!currentIds.has(prevId)) {
          batch.delete(doc(db, 'empresas', companyId, colName, prevId));
          delete prevSnap[prevId];
          opCount++;
          if (opCount >= 490) await flush();
        }
      }

      window._lastSaved[colName] = prevSnap;
    }

    await flush();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    showSyncStatus('✓ Salvo');
  } catch(e) {
    console.error('Firebase save error:', e);
    showSyncStatus('⚠ Salvo local', true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

async function loadFromFirebase() {
  try {
    const db = window._db;
    const { doc, getDoc, collection, getDocs } = window._fbFns;
    const companyId = window._companyId || (window._currentUser ? window._currentUser.uid : 'default');

    const snap = await getDoc(doc(db, 'empresas', companyId));

    const colSnaps = await Promise.all(
      _COLS.map(c => getDocs(collection(db, 'empresas', companyId, c)))
    );
    const hasSubcollections = colSnaps.some(s => !s.empty);

    if (hasSubcollections) {
      if (snap.exists() && snap.data().company) state.company = snap.data().company;
      window._lastSaved = {};
      _COLS.forEach((colName, i) => {
        const items = [];
        const snapCache = {};
        colSnaps[i].forEach(d => {
          items.push(d.data());
          snapCache[d.id] = JSON.stringify(d.data());
        });
        state[colName] = items;
        window._lastSaved[colName] = snapCache;
      });
    } else if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.products)) {
        // Formato antigo (single-document) — migrar para subcoleções
        Object.assign(state, data);
        window._lastSaved = {};
        await saveToFirebase();
        showSyncStatus('✓ Dados migrados para novo formato');
      } else {
        if (data.company) state.company = data.company;
      }
    } else {
      window._lastSaved = {};
      await saveToFirebase();
    }

    ['nfItems','compraItems','nfCosts','pedidoItems'].forEach(k => { if(!state[k]) state[k]=[]; });
    _COLS.forEach(k => { if(!state[k]) state[k]=[]; });

    render();
    updateTopbar();
    applyRoleUI();
    showSyncStatus('✓ Conectado ao Firebase');
  } catch(e) {
    console.error('Firebase load error:', e);
    loadState();
    render();
    updateTopbar();
    showSyncStatus('⚠ Modo offline', true);
  }
}

function showSyncStatus(msg, warn=false) {
  const el2 = document.getElementById('sync-status');
  if (!el2) return;
  el2.textContent = msg;
  el2.style.color = warn ? 'var(--amber)' : 'var(--green)';
  el2.style.opacity = '1';
  setTimeout(() => { el2.style.opacity = '0'; }, 3000);
}

function updateTopbar() {
  const days=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const months=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const now=new Date();
  const dateEl = document.getElementById('topbar-date');
  if(dateEl) dateEl.textContent=`${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  const footer = document.getElementById('sb-footer');
  if(footer) footer.textContent=`v2.0 · ${state.company&&state.company.name?state.company.name:"2R Comércio"}`;
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-err');
  const btn = document.querySelector('#login-screen .btn-primary');
  if (!email || !pass) { errEl.style.display='block'; errEl.textContent='Preencha e-mail e senha.'; return; }
  btn.textContent = 'Entrando...'; btn.disabled = true;
  try {
    const { signInWithEmailAndPassword } = window._fbFns;
    await signInWithEmailAndPassword(window._auth, email, pass);
    errEl.style.display = 'none';
  } catch(e) {
    errEl.style.display = 'block';
    errEl.textContent = 'E-mail ou senha incorretos.';
    btn.textContent = 'Entrar'; btn.disabled = false;
  }
}

async function doLogout() {
  const { signOut } = window._fbFns;
  await signOut(window._auth);
}

async function doResetPassword() {
  const emailEl = document.getElementById('login-email');
  const email = emailEl ? emailEl.value.trim() : '';
  if (!email) {
    const errEl = document.getElementById('login-err');
    errEl.style.display='block'; errEl.textContent='Digite seu e-mail acima para redefinir a senha.';
    if(emailEl) emailEl.focus(); return;
  }
  try {
    const { sendPasswordResetEmail } = window._fbFns;
    await sendPasswordResetEmail(window._auth, email);
    const errEl = document.getElementById('login-err');
    errEl.style.display='block'; errEl.style.color='var(--green)';
    errEl.style.background='rgba(63,185,80,.1)'; errEl.style.borderColor='rgba(63,185,80,.3)';
    errEl.textContent='✓ E-mail de redefinição enviado! Verifique sua caixa de entrada.';
  } catch(e) {
    const errEl = document.getElementById('login-err');
    errEl.style.display='block'; errEl.textContent='E-mail não encontrado no sistema.';
  }
}
