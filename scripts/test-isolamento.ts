/**
 * Teste REAL de isolamento entre estabelecimentos — Borali v0.2
 * Roda contra o backend Skip Cloud de PREVIEW, autenticando como o usuário
 * de teste do Mercadinho e tentando operações em produtos da Distribuidora Barbosa.
 *
 * Uso (uma vez, fora do build):  pnpm exec tsx scripts/test-isolamento.ts
 * Saída: PASS/FAIL por caso. Exit 1 se qualquer caso inesperado ocorrer.
 */
import PocketBase from 'pocketbase'

const BASE = process.env.PB_URL || 'https://borali-preview.goskip.app'
const EMAIL = 'comerciante.mercadinho@borali.local'
const PASSWORD = process.env.PB_TEST_PASSWORD || 'Skip@Pass'
const BARBOSA_STORE = 'zc5y4y12z243toe'
const BARBOSA_PRODUCT = 'hl2yinx6nx5mou0' // Água Mineral 500ml (status active, visível publicamente)

const pb = new PocketBase(BASE)

const results: { name: string; ok: boolean; detail: string }[] = []
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}: ${detail}`)
}

async function expectError(label: string, fn: () => Promise<unknown>) {
  try {
    await fn()
    record(label, false, 'operação foi ACEITA (deveria ser negada)')
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 0
    record(label, status === 400 || status === 403 || status === 404, `negada com HTTP ${status}`)
  }
}

async function main() {
  if (!PASSWORD) {
    console.error('Defina PB_TEST_PASSWORD com a senha do usuário de teste.')
    process.exit(2)
  }
  await pb.collection('users').authWithPassword(EMAIL, PASSWORD)
  record('login', true, `autenticado como ${EMAIL} (store_id=${pb.authStore.model?.store_id})`)

  // 1. Leitura cross-store de produto ACTIVE (público por design) — só nega UPDATE/DELETE
  await expectError('update cross-store', () =>
    pb.collection('products').update(BARBOSA_PRODUCT, { price: 0.01 }),
  )
  await expectError('delete cross-store', () => pb.collection('products').delete(BARBOSA_PRODUCT))
  await expectError('bulk-update cross-store', () =>
    pb.send('/backend/v1/borali/products/bulk-update', {
      method: 'POST',
      body: { ids: [BARBOSA_PRODUCT], patch: { status: 'inactive' } },
    }),
  )
  await expectError('bulk-delete cross-store', () =>
    pb.send('/backend/v1/borali/products/bulk-delete', {
      method: 'POST',
      body: { ids: [BARBOSA_PRODUCT] },
    }),
  )
  await expectError('stock adjust cross-store', () =>
    pb.send('/backend/v1/borali/stock/adjust', {
      method: 'POST',
      body: { product_id: BARBOSA_PRODUCT, delta: 5, reason: 'teste isolamento' },
    }),
  )
  await expectError('criar produto em loja alheia', () =>
    pb.collection('products').create({ store_id: BARBOSA_STORE, name: 'X', unit: 'un', price: 1 }),
  )
  await expectError('listar produtos sem status=active (lista admin de loja alheia)', () =>
    pb.collection('products').getFullList({ filter: `store_id = "${BARBOSA_STORE}"` }),
  )

  // Acesso normal aos próprios produtos do Mercadinho deve funcionar
  const own = await pb
    .collection('products')
    .getFullList({ filter: `store_id = "${pb.authStore.model?.store_id}"` })
  record(
    'listar produtos próprios',
    own.length > 0,
    `${own.length} produto(s) do Mercadinho acessíveis`,
  )

  pb.authStore.clear()
  console.log(
    '\nResumo: ' + results.filter((r) => r.ok).length + '/' + results.length + ' casos OK',
  )
  if (results.some((r) => !r.ok)) process.exit(1)
}

main().catch((err) => {
  console.error('Falha no teste:', err?.message || err)
  process.exit(1)
})
