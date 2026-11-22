/**
 * BORALI — MIGRAÇÃO 0008: correção do C0 (controle positivo do probe de isolamento).
 *
 * Causa exata (evidência: run 1i7a3fgcyvlzouk em audit_log + doc oficial PB v0.36):
 * a updateRule de products exigia "store_id = @request.body.store_id". PATCH parcial
 * SEM store_id no corpo (exatamente o que o painel faz via SDK) avalia o operando
 * @request.body.store_id como vazio e a regra falha → HTTP 404 para o DONO do
 * produto. PATCH com store_id no corpo funcionava — por isso o FAIL só apareceu
 * quando o instrumento do probe parou de reenviar store_id (restauração=404).
 *
 * Correção (padrão documentado do PocketBase p/ campo imutável):
 *   store_id = @request.body.store_id  →  @request.body.store_id:changed = false
 * (:changed é true quando o campo está ausente OU reenviado com o mesmo valor;
 *  false quando o cliente tenta REATRIBUIR a loja — segue bloqueando o cruzamento).
 *
 * Idempotente: reafirma as mesmas regras a cada execução.
 */
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products')

    products.updateRule =
      "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id && @request.body.store_id:changed = false)"

    app.save(products)
  },
  (app) => {
    // Rollback: volta à regra antiga (que quebrava PATCH parcial).
    const products = app.findCollectionByNameOrId('products')
    products.updateRule =
      "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id && store_id = @request.body.store_id)"
    app.save(products)
  },
)
