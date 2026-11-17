import pb from '@/lib/pocketbase/client'
import { City, Category, Store, Product, Order, AuditLog } from '@/types'

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

export async function getStoreBySlug(cityId: string, storeSlug: string): Promise<Store | null> {
  try {
    return await pb
      .collection('stores')
      .getFirstListItem<Store>(`city_id = "${cityId}" && slug = "${storeSlug}"`, {
        expand: 'city_id,category_ids',
      })
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
    expand: 'category_id',
    sort: '-created',
  })
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
