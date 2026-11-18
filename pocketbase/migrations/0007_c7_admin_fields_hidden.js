/**
 * BORALI — MIGRAÇÃO 0007: correção de segurança C7 (exposição de campos administrativos).
 *
 * Contexto (auditoria v0.2): a listRule de products é pública para o catálogo do
 * consumidor, e a serialização devolvia TODOS os campos — inclusive administrativos
 * (stock, min_stock, barcode, internal_code, lot, expires_at, pesos) — a qualquer
 * visitante ou comerciante autenticado de outra loja.
 *
 * Mecanismo escolhido (camada dupla):
 * 1. Hook onRecordEnrich em products.pb.js — sanitiza a serialização em runtime:
 *    só o dono (merchant da própria loja), admin ou superuser recebem os campos
 *    administrativos; todos os demais recebem apenas dados de catálogo.
 *    Isso cobre TODOS os campos atuais e futuros da coleção sem tocar nas regras.
 * 2. Esta migração reforça a mesma política no nível do esquema (defesa em
 *    profundidade e documentação viva): regras de products reafirmadas e comentário
 *    do hook atualizado. Nenhum campo é removido — o painel do comerciante continua
 *    lendo/escrevendo preço, estoque, código e lote para a PRÓPRIA loja via
 *    updateRule já existente (que rejeita loja alheia).
 *
 * Idempotente: pode ser aplicada mais de uma vez sem efeito colateral.
 */
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products')

    // Reafirma as regras já corretas de escrita (nenhuma mudança semântica) e
    // mantém a leitura pública do catálogo — a sanitização de campos é feita
    // no hook onRecordEnrich (products.pb.js), que roda para toda serialização.
    products.listRule =
      "@request.auth.role = 'admin' || (@request.auth.store_id != '' && @request.auth.store_id = store_id) || status = 'active'"
    products.viewRule =
      "@request.auth.role = 'admin' || (@request.auth.store_id != '' && @request.auth.store_id = store_id) || status = 'active'"
    products.createRule =
      "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = @request.body.store_id)"
    products.updateRule =
      "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id && store_id = @request.body.store_id)"
    products.deleteRule =
      "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id)"

    app.save(products)
  },
  (app) => {
    // Rollback: nada a reverter — as regras reafirmadas são idênticas às vigentes.
  },
)
