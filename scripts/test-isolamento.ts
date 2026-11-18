/**
 * Teste REAL de isolamento entre estabelecimentos — Borali v0.2
 * Roda contra o backend Skip Cloud de PREVIEW, autenticando como os usuários de teste
 * do Mercadinho e da Distribuidora Barbosa e tentando operações nos produtos da loja
 * ALHEIA — para provar que regras de API + hooks bloqueiam o acesso cruzado.
 *
 * Uso (uma vez, fora do build — com shell/tsx disponível):
 *   PB_URL=https://borali-preview.goskip.app \
 *   PB_TEST_PASSWORD=... \
 *   PB_TEST_PASSWORD_BARBOSA=... \
 *   pnpm exec tsx scripts/test-isolamento.ts
 *
 * Saída: PASS/FAIL por caso. Exit 1 se qualquer caso inesperado ocorrer.
 * Senhas NUNCA vão para o código: vêm de env (PB_TEST_PASSWORD / PB_TEST_PASSWORD_BARBOSA).
 */
import PocketBase from 'pocketbase'

const BASE = process.env.PB_URL || 'https://borali-preview.goskip.app'
const M_EMAIL = 'comerciante.mercadinho@borali.local'
const B_EMAIL = 'comerciante.barbosa@borali.local'
const M_PASS = process.env.PB_TEST_PASSWORD
const B_PASS = process.env.PB_TEST_PASSWORD_BARBOSA

// IDs reais na base de homologação (IDs não são dados sensíveis)
const BARBOSA_STORE = 'zc5y4y12z243toe'
const MERCADINHO_STORE = 'jcm1keiv55i8q6v'
const BARBOSA_PRODUCT = 'hl2yinx6nx5mou0' // [DEMO] Água Mineral 500ml
const MERCADINHO_PRODUCT = 'n5mt95kv9zulf50' // [DEMO] Açaí 500ml com complementos

const pb = new PocketBase(BASE)

const results: { name: string; ok: boolean; detail: string }[] = []
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}: ${detail}`)
}

async function expectError(label: string, want: number[], fn: () => Promise<unknown>) {
  try {
    await fn()
    record(label, false, 'operação foi ACEITA (deveria ser negada)')
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 0
    record(label, want.includes(status), `esperado ${want.join('/')} — recebido HTTP ${status}`)
  }
}

async function main() {
  if (!M_PASS || !B_PASS) {
    console.error('Defina PB_TEST_PASSWORD e PB_TEST_PASSWORD_BARBOSA com as senhas de teste.')
    process.exit(2)
  }

  // Autenticação real via API REST (mesma rota que o painel usa)
  const mPb = new PocketBase(BASE)
  await mPb.collection('users').authWithPassword(M_EMAIL, M_PASS)
  record(
    'login Mercadinho',
    true,
    `autenticado como ${M_EMAIL} (store_id=${(mPb.authStore.model as { store_id?: string })?.store_id})`,
  )

  const bPb = new PocketBase(BASE)
  await bPb.collection('users').authWithPassword(B_EMAIL, B_PASS)
  record(
    'login Barbosa',
    true,
    `autenticado como ${B_EMAIL} (store_id=${(bPb.authStore.model as { store_id?: string })?.store_id})`,
  )

  // ============ CONTROLES POSITIVOS (operação legítima na PRÓPRIA loja) ============
  const own = await mPb
    .collection('products')
    .getFullList({ filter: `store_id = "${MERCADINHO_STORE}"` })
  record(
    'P1 listar produtos próprios (Mercadinho)',
    own.length > 0,
    `${own.length} produto(s) do Mercadinho acessíveis`,
  )

  const bOwn = await bPb.collection('products').getFirstListItem(`store_id = "${BARBOSA_STORE}"`)
  const bOrigPrice = (bOwn as unknown as { price: number }).price
  await bPb.collection('products').update(BARBOSA_PRODUCT, { price: bOrigPrice })
  record(
    'P2 atualizar preço do PRÓPRIO produto (Barbosa, mesmo valor — sem mutação)',
    true,
    `PATCH 200 com price=${bOrigPrice} (restaurado)`,
  )

  await expectError(
    'P3 stock/adjust na PRÓPRIA loja com delta 0 (shape aceito, sem mutação)',
    [400],
    () =>
      mPb.send('/backend/v1/borali/stock/adjust', {
        method: 'POST',
        body: {
          product_id: MERCADINHO_PRODUCT,
          delta: 0,
          reason: 'homolog: controle positivo sem mutação',
        },
      }),
  )

  const mOwnAcai = await mPb.collection('products').getFirstListItem(`id = "${MERCADINHO_PRODUCT}"`)
  const mOrigPrice = (mOwnAcai as unknown as { price: number }).price
  await mPb.collection('products').update(MERCADINHO_PRODUCT, { price: mOrigPrice })
  record(
    'P4 atualizar preço do PRÓPRIO produto (Mercadinho, mesmo valor — sem mutação)',
    true,
    `PATCH 200 com price=${mOrigPrice} (restaurado)`,
  )

  // ============ CASOS DE ISOLAMENTO (cross-store) ============
  // C1: Mercadinho tenta PATCH no produto da Barbosa
  await expectError('C1 PATCH cross-store (products)', [403], () =>
    mPb.collection('products').update(BARBOSA_PRODUCT, { price: 0.01 }),
  )
  // C2: Mercadinho tenta DELETE no produto da Barbosa
  await expectError('C2 DELETE cross-store (products)', [403], () =>
    mPb.collection('products').delete(BARBOSA_PRODUCT),
  )
  // C3: bulk-update cross-store nos dois sentidos
  await expectError('C3 bulk-update cross-store (Mercadinho -> Barbosa)', [403], () =>
    mPb.send('/backend/v1/borali/products/bulk-update', {
      method: 'POST',
      body: { ids: [BARBOSA_PRODUCT], patch: { price: 0.01 } },
    }),
  )
  await expectError('C3b bulk-update cross-store (Barbosa -> Mercadinho)', [403], () =>
    bPb.send('/backend/v1/borali/products/bulk-update', {
      method: 'POST',
      body: { ids: [MERCADINHO_PRODUCT], patch: { price: 0.01 } },
    }),
  )
  // C4: bulk-delete cross-store
  await expectError('C4 bulk-delete cross-store', [403], () =>
    mPb.send('/backend/v1/borali/products/bulk-delete', {
      method: 'POST',
      body: { ids: [BARBOSA_PRODUCT] },
    }),
  )
  // C5: stock/adjust cross-store
  await expectError('C5 stock/adjust cross-store', [403], () =>
    mPb.send('/backend/v1/borali/stock/adjust', {
      method: 'POST',
      body: { product_id: BARBOSA_PRODUCT, delta: -1, reason: 'homolog' },
    }),
  )
  // C6: criar produto apontando para a loja alheia
  await expectError('C6 create cross-store (products)', [400, 403], () =>
    mPb.collection('products').create({
      store_id: BARBOSA_STORE,
      name: 'HOMOLOG-TESTE',
      price: 1,
      unit: 'un',
      status: 'active',
    }),
  )
  // C7: listagem cross-store — 200 com totalItems=0 é PASS (não é 4xx)
  try {
    const res = await mPb
      .collection('products')
      .getList(1, 10, { filter: `store_id = "${BARBOSA_STORE}"` })
    record(
      'C7 list cross-store (products)',
      res.totalItems === 0,
      `esperado 200 com totalItems=0 — recebido HTTP 200 com totalItems=${res.totalItems}`,
    )
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 0
    record('C7 list cross-store (products)', false, `falhou com HTTP ${status} (esperado 200/0)`)
  }

  mPb.authStore.clear()
  bPb.authStore.clear()
  console.log(
    '\nResumo: ' + results.filter((r) => r.ok).length + '/' + results.length + ' casos OK',
  )
  if (results.some((r) => !r.ok)) process.exit(1)
}

main().catch((err) => {
  console.error('Falha no teste:', err?.message || err)
  process.exit(1)
})
