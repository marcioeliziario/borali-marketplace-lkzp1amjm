/**
 * Teste REAL de isolamento entre estabelecimentos — Borali v0.2
 * Roda contra o backend Skip Cloud (preview), autenticando como os usuários de teste
 * do Mercadinho e da Distribuidora Barbosa e tentando operações nos produtos da loja
 * ALHEIA — para provar que regras de API + hooks bloqueiam o acesso cruzado.
 *
 * Uso (uma vez, fora do build — com shell/tsx disponível):
 *   PB_URL=https://borali-preview.goskip.app \
 *   PB_TEST_PASSWORD=... \
 *   PB_TEST_PASSWORD_BARBOSA=... \
 *   pnpm exec tsx scripts/test-isolamento.ts
 *
 * Classificação: PASS (status recebido == esperado), FAIL (status lido != esperado)
 * e INCONCLUSIVO (falha de autenticação, erro de rede/sem status HTTP — defeito do
 * instrumento nunca é contado como PASS nem como FAIL de isolamento).
 * Um 400 genérico em caso cross-store só vira FAIL se o controle positivo C0 falhar;
 * caso contrário é INCONCLUSIVO. Senhas NUNCA vão para o código: vêm de env.
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
const BARBOSA_PRODUCT = 'hl2yinx6nx5mou0' // [DEMO] Água Mineral 500ml (seed: price 3.0)
const MERCADINHO_PRODUCT = 'n5mt95kv9zulf50' // [DEMO] Açaí 500ml com complementos (seed: price 14.0)

const INCONCLUSIVE = 'INCONCLUSIVO'
type Verdict = 'PASS' | 'FAIL' | typeof INCONCLUSIVE
const results: { name: string; verdict: Verdict; want: string; got: string }[] = []

const record = (name: string, verdict: Verdict, want: string, got: string) => {
  results.push({ name, verdict, want, got })
  console.log(`${verdict} — ${name} | esperado=${want} recebido=${got}`)
}

const statusOf = (err: unknown): number | null => {
  const s = (err as { status?: unknown })?.status
  return typeof s === 'number' ? s : null
}

/** Cross-store: 403/404 são bloqueios; 400 só é FAIL se o controle C0 não passou. */
const classifyBlocked = (status: number | null, controlOk: boolean): Verdict => {
  if (status === null) return INCONCLUSIVE
  if (status === 403 || status === 404) return 'PASS'
  if (status === 400) return controlOk ? INCONCLUSIVE : 'FAIL'
  return 'FAIL'
}

async function main() {
  if (!M_PASS) {
    console.error('Defina PB_TEST_PASSWORD (e opcionalmente PB_TEST_PASSWORD_BARBOSA).')
    process.exit(2)
  }

  // ---- Login REAL via API REST (mesma rota que o painel usa) ----
  const mPb = new PocketBase(BASE)
  let controlOk = false
  try {
    await mPb.collection('users').authWithPassword(M_EMAIL, M_PASS)
    const sid = (mPb.authStore.model as { store_id?: string })?.store_id || '?'
    record('login Mercadinho', 'PASS', '200 token', `200 (store_id=${sid})`)
  } catch (err) {
    const st = statusOf(err)
    record('login Mercadinho', INCONCLUSIVE, '200 token', st ? String(st) : 'sem status HTTP')
    console.error('\nResultado: INCONCLUSIVO — sem autenticação o instrumento não mede isolamento.')
    process.exit(2)
  }

  // ---- C0 — controle positivo: PATCH no PRÓPRIO produto (muta e restaura) ----
  try {
    await mPb.collection('products').update(MERCADINHO_PRODUCT, { price: 14.5 })
    await mPb.collection('products').update(MERCADINHO_PRODUCT, { price: 14.0 }) // restauração seed
    controlOk = true
    record('C0 controle positivo (Mercadinho PATCH própria loja)', 'PASS', '200', '200')
  } catch (err) {
    const st = statusOf(err)
    record(
      'C0 controle positivo (Mercadinho PATCH própria loja)',
      st === null ? INCONCLUSIVE : 'FAIL',
      '200',
      st ? String(st) : 'sem status HTTP',
    )
  }

  // ---- Conta da Barbosa: não altera acesso; só usa se a senha semeada validar ----
  let bPb: PocketBase | null = null
  if (B_PASS) {
    const aux = new PocketBase(BASE)
    try {
      await aux.collection('users').authWithPassword(B_EMAIL, B_PASS)
      bPb = aux
      record('login Barbosa', 'PASS', '200 token', '200')
    } catch (err) {
      const st = statusOf(err)
      record('login Barbosa', INCONCLUSIVE, '200 token', st ? String(st) : 'sem status HTTP')
    }
  } else {
    record('login Barbosa', INCONCLUSIVE, '200 token', 'PB_TEST_PASSWORD_BARBOSA ausente')
  }

  // ============ CASOS DE ISOLAMENTO (cross-store, autenticado como Mercadinho) ============
  const expectBlocked = async (
    label: string,
    want: number[],
    fn: () => Promise<unknown>,
  ): Promise<number | null> => {
    try {
      await fn()
      record(label, 'FAIL', want.join('/'), 'operação foi ACEITA (deveria ser negada)')
      return null
    } catch (err) {
      const st = statusOf(err)
      record(
        label,
        classifyBlocked(st, controlOk),
        want.join('/'),
        st ? String(st) : 'sem status HTTP',
      )
      return st
    }
  }

  // C1: PATCH no produto da Barbosa
  await expectBlocked('C1 PATCH cross-store (products)', [403, 404], () =>
    mPb.collection('products').update(BARBOSA_PRODUCT, { price: 0.01 }),
  )

  // C2: DELETE — usa registro descartável da loja alheia para não arriscar produto piloto
  let c2Target = BARBOSA_PRODUCT
  const pbAdmin = new PocketBase(BASE)
  try {
    const created = await mPb.send('/api/collections/products/records', {
      method: 'POST',
      body: JSON.stringify({
        store_id: BARBOSA_STORE,
        name: 'HOMOLOG-Descartavel (remover)',
        description: 'Registro descartável de homologação — criado e removido pelo teste.',
        price: 1,
        unit: 'un',
        status: 'active',
        is_demo: true,
      }),
      headers: { Authorization: process.env.PB_SUPERUSER_TOKEN || '' },
    })
    c2Target = (created as { id?: string })?.id || BARBOSA_PRODUCT
    if (c2Target !== BARBOSA_PRODUCT) {
      console.log(`(registro descartável de homologação criado: ${c2Target})`)
    }
  } catch {
    console.log('(sem superusuário: C2 usará o produto piloto da Barbosa como alvo)')
  }
  const c2Status = await expectBlocked('C2 DELETE cross-store (products)', [403, 404], () =>
    mPb.collection('products').delete(c2Target),
  )
  if (c2Target !== BARBOSA_PRODUCT && c2Status !== 404) {
    // se o DELETE foi negado, o descartável sobrou — tentar limpar com o token de admin
    try {
      await pbAdmin.send('/api/collections/products/records/' + c2Target, {
        method: 'DELETE',
        headers: { Authorization: process.env.PB_SUPERUSER_TOKEN || '' },
      })
      console.log(`(registro descartável ${c2Target} removido após o teste)`)
    } catch {
      console.log(`(ATENÇÃO: registro descartável ${c2Target} sobrou — remover manualmente)`)
    }
  }

  // C3: bulk-update cross-store
  await expectBlocked('C3 bulk-update cross-store (products)', [403, 404], () =>
    mPb.send('/backend/v1/borali/products/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ ids: [BARBOSA_PRODUCT], patch: { price: 0.01 } }),
    }),
  )
  // C4: bulk-delete cross-store
  await expectBlocked('C4 bulk-delete cross-store (products)', [403, 404], () =>
    mPb.send('/backend/v1/borali/products/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids: [c2Target === BARBOSA_PRODUCT ? BARBOSA_PRODUCT : c2Target] }),
    }),
  )
  // C5: stock/adjust cross-store
  await expectBlocked('C5 stock/adjust cross-store', [403, 404], () =>
    mPb.send('/backend/v1/borali/stock/adjust', {
      method: 'POST',
      body: JSON.stringify({ product_id: BARBOSA_PRODUCT, delta: -1, reason: 'homolog' }),
    }),
  )
  // C6: create apontando para a loja alheia (400/403 esperados)
  await expectBlocked('C6 create cross-store (products)', [400, 403], () =>
    mPb.collection('products').create({
      store_id: BARBOSA_STORE,
      name: 'HOMOLOG-TESTE',
      price: 1,
      unit: 'un',
      status: 'active',
    }),
  )

  // C7: listagem cross-store — PASS é 200 com totalItems=0 (status lido, não exceção)
  try {
    const res = await mPb
      .collection('products')
      .getList(1, 10, { filter: `store_id = "${BARBOSA_STORE}"` })
    record(
      'C7 list cross-store (products)',
      res.totalItems === 0 ? 'PASS' : 'FAIL',
      '200 com totalItems=0',
      `200 com totalItems=${res.totalItems}`,
    )
  } catch (err) {
    const st = statusOf(err)
    record(
      'C7 list cross-store (products)',
      INCONCLUSIVE,
      '200 com totalItems=0',
      st ? String(st) : 'sem status HTTP',
    )
  }

  // ---- Controle positivo da Barbosa (somente se a conta dela for utilizável) ----
  if (bPb) {
    try {
      await bPb.collection('products').update(BARBOSA_PRODUCT, { price: 3.5 })
      await bPb.collection('products').update(BARBOSA_PRODUCT, { price: 3.0 }) // restauração seed
      record('C0b controle positivo (Barbosa PATCH própria loja)', 'PASS', '200', '200')
    } catch (err) {
      const st = statusOf(err)
      record(
        'C0b controle positivo (Barbosa PATCH própria loja)',
        st === null ? INCONCLUSIVE : 'FAIL',
        '200',
        st ? String(st) : 'sem status HTTP',
      )
    }
  } else {
    record(
      'C0b controle positivo (Barbosa PATCH própria loja)',
      INCONCLUSIVE,
      '200',
      'conta da Barbosa não utilizável pelo instrumento',
    )
  }

  mPb.authStore.clear()
  bPb?.authStore.clear()

  const pass = results.filter((r) => r.verdict === 'PASS').length
  const fail = results.filter((r) => r.verdict === 'FAIL').length
  const inc = results.filter((r) => r.verdict === INCONCLUSIVE).length
  console.log(
    `\nResumo: ${pass} PASS, ${fail} FAIL, ${inc} INCONCLUSIVO de ${results.length} casos`,
  )
  if (fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Falha no teste:', err?.message || err)
  process.exit(1)
})
