import pb from '@/lib/pocketbase/client'
import {
  City,
  Category,
  Store,
  Product,
  Order,
  AuditLog,
  StoreCategory,
  StockMovement,
} from '@/types'

// CIDADES
export async function getCities(): Promise<City[]> {
  try {
    return await pb.collection('cities').getFullList<City>({
      sort: '-is_pilot,name',
      filter: 'is_active = true',
    })
  } catch (error) {
    console.error('Erro ao buscar cidades:', error)
    return []
  }
}

export async function getAllCitiesAdmin(): Promise<City[]> {
  return await pb.collection('cities').getFullList<City>({
    sort: '-is_pilot,name',
  })
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  try {
    return await pb.collection('cities').getFirstListItem<City>(`slug = "${slug}"`)
  } catch {
    return null
  }
}

// CATEGORIAS
export async function getCategories(): Promise<Category[]> {
  try {
    return await pb.collection('categories').getFullList<Category>({
      sort: 'display_order,name',
      filter: 'is_active = true',
    })
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return []
  }
}

export async function getAllCategoriesAdmin(): Promise<Category[]> {
  return await pb.collection('categories').getFullList<Category>({
    sort: 'display_order,name',
  })
}

// ESTABELECIMENTOS (STORES)
export async function getStoresByCity(cityId: string, categoryId?: string): Promise<Store[]> {
  try {
    let filter = `city_id = "${cityId}" && status = "approved" && is_active = true`
    if (categoryId) {
      filter += ` && category_ids ~ "${categoryId}"`
    }
    return await pb.collection('stores').getFullList<Store>({
      filter,
      expand: 'city_id,category_ids',
      sort: '-is_featured,name',
    })
  } catch (error) {
    console.error('Erro ao buscar lojas:', error)
    return []
  }
}

export async function getAllStoresAdmin(): Promise<Store[]> {
  return await pb.collection('stores').getFullList<Store>({
    expand: 'city_id,category_ids',
    sort: '-created',
  })
}

/**
 * Resolve a loja pelo slug da cidade + slug da loja (rota /:citySlug/:storeSlug).
 * Filtra via relação city_id.slug — não depende de resolver a cidade antes,
 * e usa o MESMO critério de disponibilidade da home (approved + is_active).
 */
export async function getStoreBySlug(citySlug: string, storeSlug: string): Promise<Store | null> {
  try {
    return await pb
      .collection('stores')
      .getFirstListItem<Store>(
        `city_id.slug = "${citySlug}" && slug = "${storeSlug}" && status = "approved" && is_active = true`,
        {
          expand: 'city_id,category_ids',
        },
      )
  } catch {
    return null
  }
}

export async function getStoreById(storeId: string): Promise<Store | null> {
  try {
    return await pb.collection('stores').getOne<Store>(storeId, {
      expand: 'city_id,category_ids',
    })
  } catch {
    return null
  }
}

export async function updateStore(storeId: string, data: Partial<Store>): Promise<Store> {
  return await pb.collection('stores').update<Store>(storeId, data)
}

// CATEGORIAS INTERNAS DA LOJA
export async function getStoreCategories(storeId: string): Promise<StoreCategory[]> {
  try {
    return await pb.collection('store_categories').getFullList<StoreCategory>({
      filter: `store_id = "${storeId}" && is_active = true`,
      sort: 'display_order,name',
    })
  } catch (error) {
    console.error('Erro ao buscar categorias internas:', error)
    return []
  }
}

export async function getAllStoreCategoriesAdmin(storeId: string): Promise<StoreCategory[]> {
  return await pb.collection('store_categories').getFullList<StoreCategory>({
    filter: `store_id = "${storeId}"`,
    sort: 'display_order,name',
  })
}

export async function createStoreCategory(data: Partial<StoreCategory>): Promise<StoreCategory> {
  return await pb.collection('store_categories').create<StoreCategory>(data)
}

/** Aliases usados pelo CategoryManagerModal (mesma coleção store_categories). */
export const createProductCategory = createStoreCategory
export const updateProductCategory = updateStoreCategory
export const deleteProductCategory = deleteStoreCategory

export async function updateStoreCategory(
  id: string,
  data: Partial<StoreCategory>,
): Promise<StoreCategory> {
  return await pb.collection('store_categories').update<StoreCategory>(id, data)
}

export async function deleteStoreCategory(id: string): Promise<boolean> {
  return await pb.collection('store_categories').delete(id)
}

// PRODUTOS
export async function getProductsByStore(storeId: string, categoryId?: string): Promise<Product[]> {
  try {
    let filter = `store_id = "${storeId}" && status = "active"`
    if (categoryId) {
      filter += ` && category_id = "${categoryId}"`
    }
    return await pb.collection('products').getFullList<Product>({
      filter,
      expand: 'category_id',
      sort: 'name',
    })
  } catch (error) {
    console.error('Erro ao buscar produtos da loja:', error)
    return []
  }
}

export async function getMerchantProducts(storeId: string): Promise<Product[]> {
  return await pb.collection('products').getFullList<Product>({
    filter: `store_id = "${storeId}"`,
    expand: 'category_id,store_category_id',
    sort: '-created',
  })
}

/** Histórico de movimentações de estoque de um produto */
export async function getStockMovements(options: {
  productId: string
  perPage?: number
}): Promise<StockMovement[]> {
  try {
    return await pb
      .collection('stock_movements')
      .getList<StockMovement>(1, options.perPage ?? 20, {
        filter: `product_id = "${options.productId}"`,
        sort: '-created',
      })
      .then((r) => r.items)
  } catch (error) {
    console.error('Erro ao buscar movimentações de estoque:', error)
    return []
  }
}

/** Ajuste manual de estoque — o hook backend registra a movimentação e bloqueia negativo */
export async function adjustStock(
  productId: string,
  delta: number,
  reason: string,
): Promise<Product> {
  const res = await pb.send('/backend/v1/borali/stock/adjust', {
    method: 'POST',
    body: { product_id: productId, delta, reason },
  })
  return res as Product
}

/** Atualização em lote via hook backend (valida propriedade server-side) */
export async function bulkUpdateProducts(
  ids: string[],
  patch: Record<string, unknown>,
): Promise<{ updated: string[] }> {
  const res = await pb.send('/backend/v1/borali/products/bulk-update', {
    method: 'POST',
    body: { ids, patch },
  })
  return res as { updated: string[] }
}

/** Exclusão em lote via hook backend — produtos com histórico são arquivados, não excluídos */
export async function bulkDeleteProducts(
  ids: string[],
): Promise<{ deleted: string[]; skipped_archived: string[] }> {
  const res = await pb.send('/backend/v1/borali/products/bulk-delete', {
    method: 'POST',
    body: { ids },
  })
  return res as { deleted: string[]; skipped_archived: string[] }
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  return await pb.collection('products').create<Product>(data)
}

export async function updateProduct(productId: string, data: Partial<Product>): Promise<Product> {
  return await pb.collection('products').update<Product>(productId, data)
}

export async function deleteProduct(productId: string): Promise<boolean> {
  return await pb.collection('products').delete(productId)
}

// PEDIDOS (Estrutura)
export async function getStoreOrders(storeId: string): Promise<Order[]> {
  try {
    return await pb.collection('orders').getFullList<Order>({
      filter: `store_id = "${storeId}"`,
      sort: '-created',
    })
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error)
    return []
  }
}

export async function getAllOrdersAdmin(): Promise<Order[]> {
  try {
    return await pb.collection('orders').getFullList<Order>({
      expand: 'store_id',
      sort: '-created',
    })
  } catch (error) {
    console.error('Erro ao buscar pedidos admin:', error)
    return []
  }
}

// AUDITORIA
export async function logAudit(
  action: string,
  resource: string,
  resourceId?: string,
  details?: any,
) {
  try {
    const user = pb.authStore.model
    await pb.collection('audit_log').create({
      user_id: user?.id || null,
      user_email: user?.email || 'anônimo',
      user_role: user?.role || 'visitante',
      action,
      resource,
      resource_id: resourceId || '',
      details: details ? JSON.stringify(details) : null,
    })
  } catch (err) {
    console.warn('Falha silenciosa ao registrar auditoria:', err)
  }
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    return await pb.collection('audit_log').getFullList<AuditLog>({
      sort: '-created',
    })
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error)
    return []
  }
}
