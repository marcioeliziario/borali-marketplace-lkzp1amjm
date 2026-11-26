/**
 * BORALI v0.3 — Fluxo Completo de Marketplace
 * Estrutura de dados para: carrinho, cálculo seguro no servidor,
 * comissões, split de pagamentos, repasses, entregas.
 * Nenhuma integração de pagamento real é ativada nesta migração.
 */
migrate(
  (app) => {
    // =====================
    // CART_ITEMS
    // =====================
    const cartItemsCol = new Collection({
      name: "cart_items",
      schema: [
        { name: "sessionId", type: "text", required: true },
        { name: "product", type: "relation", required: true, options: { collectionId: "products" } },
        { name: "quantity", type: "number", required: true, min: 1 },
        { name: "unitPrice", type: "number", required: true },
        { name: "addedAt", type: "date", required: true },
      ],
      listRule: "sessionId = @request.auth.id || false",
      viewRule: "sessionId = @request.auth.id || false",
      createRule: "sessionId = @request.auth.id || false",
      updateRule: "sessionId = @request.auth.id || false",
      deleteRule: "sessionId = @request.auth.id || false",
    });

    // =====================
    // DELIVERIES
    // =====================
    const deliveriesCol = new Collection({
      name: "deliveries",
      schema: [
        { name: "order", type: "relation", required: true, options: { collectionId: "orders" } },
        { name: "status", type: "text", required: true, default: "pending" },
        { name: "courier", type: "text" },
        { name: "trackingCode", type: "text" },
        { name: "estimatedDelivery", type: "date" },
        { name: "deliveredAt", type: "date" },
        { name: "address", type: "text" },
        { name: "notes", type: "text" },
        { name: "createdAt", type: "date", required: true },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });

    // =====================
    // COMMISSIONS
    // =====================
    const commissionsCol = new Collection({
      name: "commissions",
      schema: [
        { name: "store", type: "relation", required: true, options: { collectionId: "stores" } },
        { name: "order", type: "relation", required: true, options: { collectionId: "orders" } },
        { name: "amount", type: "number", required: true },
        { name: "percentage", type: "number", required: true },
        { name: "status", type: "text", required: true, default: "pending" },
        { name: "paidAt", type: "date" },
        { name: "createdAt", type: "date", required: true },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });

    // =====================
    // PAYMENT_SPLITS
    // =====================
    const paymentSplitsCol = new Collection({
      name: "payment_splits",
      schema: [
        { name: "order", type: "relation", required: true, options: { collectionId: "orders" } },
        { name: "store", type: "relation", required: true, options: { collectionId: "stores" } },
        { name: "grossAmount", type: "number", required: true },
        { name: "commissionAmount", type: "number", required: true },
        { name: "netAmount", type: "number", required: true },
        { name: "status", type: "text", required: true, default: "pending" },
        { name: "paidAt", type: "date" },
        { name: "createdAt", type: "date", required: true },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });

    app.addCollection(cartItemsCol);
    app.addCollection(deliveriesCol);
    app.addCollection(commissionsCol);
    app.addCollection(paymentSplitsCol);
  },
  (app) => {
    // Reverter adições (segurança)
    const colNames = ["cart_items", "deliveries", "commissions", "payment_splits"];
    colNames.forEach((name) => {
      const col = app.findCollectionByNameOrId(name);
      if (col) app.removeCollection(col);
    });
  }
);
