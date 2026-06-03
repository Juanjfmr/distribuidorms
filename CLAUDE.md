# distribuidorms — Contexto do Projeto

## O que é

ERP single-file para a **2R Comércio** (distribuidora de alimentos/bebidas, Mato Grosso do Sul).
Sistema personalizado, em produção, com dados reais da empresa.

- **URL**: https://juanjfmr.github.io/distribuidorms/
- **Repositório**: https://github.com/Juanjfmr/distribuidorms
- **Hospedagem**: GitHub Pages (estático, zero servidor)
- **Banco de dados**: Firebase Firestore (`distribuidora-martins-6711e`)
- **Autenticação**: Firebase Auth (email/senha)

## Arquivo único

Todo o sistema está em **`index.html`** (~3354 linhas). Não há build, bundler nem dependências locais.
Estrutura interna:

```
<script type="module">   ← Firebase SDK + onAuthStateChanged (linhas 8–78)
<style>                  ← CSS completo (linhas ~80–290)
<body>                   ← HTML: sidebar, topbar, modal, content (linhas ~290–300)
<script>                 ← Toda a lógica JS (linhas ~301–3354)
```

## Estado global

```javascript
let state = {
  company, products, clients, suppliers,
  invoices, purchases, receivables, payables,
  transactions, stockMovements,
  orders, returns,
  // UI temporários (nunca persistidos):
  nfItems, compraItems, pedidoItems, nfCosts,
  currentView, contasTab, cashFilter, relPeriod, relTab
}
```

`STORAGE_KEY = "distribuidorms_v2"` — localStorage usado como fallback offline.

## Constantes importantes

```javascript
const UNITS    = ["UN","CX","DZ","PCT","KG","LT","MT","FD"];
const PAY_TERMS = ["À Vista","7 dias","14 dias","21 dias","28 dias","30 dias",
                   "35 dias","42 dias","30/60","30/60/90"];
const CAT_PROD  = ["Bebidas","Alimentos","Limpeza","Higiene","Outros"];
```

`generateReceivables()` aceita qualquer padrão `"N dias"` via regex — não precisa de novo `if` para adicionar prazo.

## Padrão render/filter

Cada módulo segue o padrão:
- `render*()` — reconstrói a página inteira (innerHTML do `#content`), depois chama `filter*()`
- `filter*()` — atualiza apenas o `<tbody>` (preserva foco e inputs ativos)

**Nunca usar `renderX()` dentro de handlers de botão** — usar `filterX()` quando possível.

## Firebase / multi-usuário

```javascript
window._companyId  // ID da empresa (UID do admin fundador)
window._currentUser // Firebase Auth user
window._userRole   // 'admin' | 'vendedor' | 'visualizador'
```

**Documento de dados**: `empresas/{companyId}` — único documento compartilhado por todos os usuários da empresa.

**Descoberta de empresa**: `config/global` → `{ companyId }` — criado na primeira vez que um admin loga, nunca sobrescrito. Todos os outros usuários leem esse documento para descobrir a qual empresa pertencem.

**Perfil de usuário**: `users/{uid}` → `{ name, email, role, active, companyId, createdAt }`

## Roles

| Role | Acesso |
|------|--------|
| `admin` | Tudo — incluindo Configurações e Usuários |
| `vendedor` | Produtos, Clientes, Fornecedores, Pedidos, NF, Devoluções, Compras, Contas, Caixa, Relatórios |
| `visualizador` | Somente Dashboard e Relatórios (botões de ação ocultos) |

## Módulos / views

| View | Render | Filter |
|------|--------|--------|
| `dashboard` | `renderDashboard()` | — |
| `produtos` | `renderProdutos()` | `filterProdutos()` |
| `clientes` | `renderClientes()` | `filterClientes()` |
| `fornecedores` | `renderFornecedores()` | `filterFornecedores()` |
| `pedidos` | `renderPedidos()` | `filterPedidos()` |
| `notas` | `renderNotas()` | `filterNotas()` |
| `devolucoes` | `renderDevolucoes()` | `filterDevolucoes()` |
| `compras` | `renderCompras()` | `filterCompras()` |
| `contas` | `renderContas()` | — |
| `caixa` | `renderCaixa()` | — |
| `relatorios` | `renderRelatorios()` | — |
| `config` | `renderConfig()` | — |
| `usuarios` | `renderUsuarios()` | — |

## Padrões críticos

### Mutex de salvamento
```javascript
if(!_guardSave()) return;   // início de qualquer async save
// ... lógica ...
try{ await saveToFirebase(); } finally{ _doneSave(); }
```
Nunca omitir `_doneSave()` no `finally`.

### IDs
```javascript
uid() = Date.now() + Math.floor(Math.random()*9999)
```
Usado para todos os novos registros. Objetos antigos têm `id` numérico simples (1, 2, 3…).

### Parcelas com saldo
Campo `isSaldo: true` em parcelas criadas por pagamento parcial.
Exibido como badge `<span class="badge bg-amber">saldo</span>` na coluna Parcela.

### Devolução → NF
`nf.returnedTotal` — acumulado de devoluções sobre a NF.
Ao salvar devolução, recebíveis em aberto são baixados automaticamente (do mais antigo).
`viewNF()` exibe "Devolvido" e "Líquido recebível" quando `returnedTotal > 0`.

## Fluxo de pedido → NF

```
Pedido (rascunho)
  → confirmarPedido()   → status: confirmado
  → faturarPedido()     → abre modal NF pré-preenchido
  → emitirNFdePedido()  → cria NF, baixa estoque, gera recebíveis, marca pedido como faturado
                           (o.invoiceId = inv.id)
```

`viewPedido()` exibe link clicável para a NF quando `o.status === "faturado"`.

## Regras de negócio importantes

- **Excluir cliente**: bloqueado se tiver NFs ativas, pedidos ou recebíveis em aberto
- **Excluir fornecedor**: bloqueado se tiver compras ativas ou pagamentos em aberto
- **Editar pedido**: apenas status `rascunho` ou `confirmado`
- **Cancelar devolução**: reverte estoque, estorna caixa, reduz `nf.returnedTotal`
- **Estoque negativo**: nunca permitido — `Math.max(0, stock - qty)`

## O que NÃO fazer

- Não alterar sem mostrar o plano ao usuário primeiro
- Não commitar `.env` ou credenciais
- Não usar `render*()` onde `filter*()` resolve (evita perda de foco)
- Não criar arquivos de documentação sem pedido explícito
- Não remover dados de exemplo do `defaultState` — já está limpo (arrays vazios) para produção
