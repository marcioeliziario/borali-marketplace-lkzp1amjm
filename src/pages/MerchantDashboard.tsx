import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  getStoreById,
  getMerchantProducts,
  getAllStoreCategoriesAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProducts,
  bulkDeleteProducts,
  logAudit,
  getStoreOrders,
} from '@/services/api'
import type { Product, Store, StoreCategory, Order } from '@/types'
import { getEffectivePrice, isPromoActive, getPromoInfo, formatBRL } from '@/lib/catalog'
import { productsToCSV } from '@/lib/csv'
import {
  ProductFormModal,
  formValuesToPayload,
  emptyProductForm,
  type ProductFormValues,
} from '@/components/merchant/ProductFormModal'
import { PhotosEditor } from '@/components/merchant/PhotosEditor'
import { VariationsEditor } from '@/components/merchant/VariationsEditor'
import { ComplementsEditor } from '@/components/merchant/ComplementsEditor'
import { CategoryManagerModal } from '@/components/merchant/CategoryManagerModal'
import { StockAdjustModal } from '@/components/merchant/StockAdjustModal'
import { CSVImportModal } from '@/components/merchant/CSVImportModal'
import pb from '@/lib/pocketbase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  Copy,
  Download,
  FileUp,
  FolderTree,
  Loader2,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
  Store as StoreIcon,
  Trash2,
  TriangleAlert,
  Upload,
} from 'lucide-react'

const MAX_MB = 5
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

type QuickEditModal = { product: Product; section: 'photos' | 'variations' | 'complements' } | null

/** Painel do Comerciante — v0.2 completo (produtos, fotos, promoções, estoque, lote, CSV). */
export const MerchantDashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const { toast } = useToast()

  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Seleção em lote
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState<
    null | 'archive' | 'activate' | 'deactivate' | 'delete' | 'duplicate'
  >(null)

  // Formulários e modais
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [quickEdit, setQuickEdit] = useState<QuickEditModal>(null)
  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockOpen, setStockOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [deleting, setDeleting] = useState<Product | null>(null)

  useEffect(() => {
    if (!user?.store_id) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [storeData, prods, cats, ords] = await Promise.all([
          getStoreById(user.store_id),
          getMerchantProducts(user.store_id),
          getAllStoreCategoriesAdmin(user.store_id),
          getStoreOrders(user.store_id),
        ])
        if (cancelled) return
        setStore(storeData)
        setProducts(prods)
        setCategories(cats)
        setOrders(ords)
      } catch (err) {
        if (!cancelled) {
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar painel',
            description: err instanceof Error ? err.message : undefined,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.store_id, toast])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.internal_code || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q),
    )
  }, [products, search])

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) =>
          p.track_stock !== false && (p.min_stock ?? 0) > 0 && (p.stock ?? 0) <= (p.min_stock ?? 0),
      ).length,
    [products],
  )

  const totalStockValue = useMemo(
    () => products.reduce((sum, p) => sum + (p.stock ?? 0) * getEffectivePrice(p), 0),
    [products],
  )

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (p: Product) => {
    setEditing(p)
    setFormOpen(true)
  }

  const handleSaved = (saved: Product, isEdit: boolean) => {
    setProducts((prev) =>
      isEdit ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev],
    )
    toast({ title: isEdit ? 'Produto atualizado' : 'Produto cadastrado', description: saved.name })
  }

  const handleStockAdjusted = (upd: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === upd.id ? { ...p, ...upd } : p)))
  }

  const askConfirm = (action: typeof confirmBulk) => {
    if (selected.size === 0) {
      toast({ variant: 'destructive', title: 'Selecione ao menos um produto' })
      return
    }
    setConfirmBulk(action)
  }

  const applyBulk = async () => {
    if (!confirmBulk) return
    const ids = [...selected]
    setBulkBusy(true)
    try {
      if (confirmBulk === 'archive' || confirmBulk === 'activate' || confirmBulk === 'deactivate') {
        const status =
          confirmBulk === 'archive'
            ? 'archived'
            : confirmBulk === 'activate'
              ? 'active'
              : 'inactive'
        await bulkUpdateProducts(ids, { status })
        setProducts((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, status } : p)))
        toast({
          title: `${ids.length} produto(s) ${confirmBulk === 'archive' ? 'arquivado(s)' : confirmBulk === 'activate' ? 'ativado(s)' : 'desativado(s)'}`,
        })
      } else if (confirmBulk === 'delete') {
        const res = await bulkDeleteProducts(ids)
        if (res.skipped_archived.length > 0) {
          setProducts((prev) =>
            prev.map((p) =>
              res.skipped_archived.includes(p.id) ? { ...p, status: 'archived' } : p,
            ),
          )
        }
        setProducts((prev) => prev.filter((p) => !res.deleted.includes(p.id)))
        toast({
          title: 'Exclusão concluída',
          description:
            res.skipped_archived.length > 0
              ? `${res.deleted.length} excluído(s); ${res.skipped_archived.length} arquivado(s) por terem histórico comercial.`
              : `${res.deleted.length} excluído(s).`,
        })
      } else if (confirmBulk === 'duplicate') {
        for (const id of ids) {
          const src = products.find((p) => p.id === id)
          if (!src) continue
          const payload = formValuesToPayload({
            ...emptyProductForm(),
            name: src.name + ' (cópia)',
            description: src.description || '',
            description_full: src.description_full || '',
            brand: src.brand || '',
            store_category_id: src.store_category_id || '',
            subcategory: src.subcategory || '',
            internal_code: '', // código interno não é copiado — evita duplicidade CSV
            barcode: '',
            unit: src.unit,
            custom_unit: src.custom_unit || '',
            status: 'draft',
            price: src.price,
            promo_price: src.promo_price || 0,
            promo_starts_date: '',
            promo_ends_date: '',
            stock: src.stock ?? 0,
            min_stock: src.min_stock ?? 0,
            track_stock: src.track_stock !== false,
            is_available: src.is_available,
            allow_fractional: !!src.allow_fractional,
            estimated_weight: src.estimated_weight || 0,
            final_weight: src.final_weight || 0,
            lot: src.lot || '',
            variations:
              typeof src.variations === 'string'
                ? JSON.parse(src.variations || '[]')
                : src.variations || [],
            complements:
              typeof src.complements === 'string'
                ? JSON.parse(src.complements || '[]')
                : src.complements || [],
          })
          await createProduct({ store_id: store!.id, is_demo: !!src.is_demo, ...payload })
        }
        const fresh = await getMerchantProducts(store!.id)
        setProducts(fresh)
        toast({
          title: `${ids.length} produto(s) duplicado(s) como rascunho`,
          description: 'Revise e ative quando quiser.',
        })
      }
      setSelected(new Set())
      setConfirmBulk(null)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro na ação em lote',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setBulkBusy(false)
    }
  }

  const handleDeleteSingle = async () => {
    if (!deleting) return
    setBulkBusy(true)
    try {
      const ok = await deleteProduct(deleting.id)
      if (ok) {
        setProducts((prev) => prev.filter((p) => p.id !== deleting.id))
        toast({ title: 'Produto excluído', description: deleting.name })
      } else {
        toast({
          variant: 'destructive',
          title: 'Não foi possível excluir',
          description: 'O produto pode ter histórico comercial.',
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setBulkBusy(false)
      setDeleting(null)
    }
  }

  const handleExportCSV = () => {
    const csv = productsToCSV(products, (p) => {
      const cat = categories.find((c) => c.id === p.store_category_id)
      return cat?.name || ''
    })
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `borali-produtos-${store?.slug || 'loja'}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'CSV exportado', description: `${products.length} produto(s).` })
  }

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)),
    )
  }
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const photoUrl = (p: Product, filename: string) =>
    `${pb.baseUrl}/api/files/products/${p.id}/${filename}`

  if (!user?.store_id) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <StoreIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">Nenhuma loja vinculada</h1>
        <p className="text-sm text-slate-500 mb-6">
          Sua conta ainda não está vinculada a um estabelecimento.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    )
  }

  const statusBadge = (p: Product) => {
    if (p.status === 'archived')
      return (
        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">
          Arquivado
        </Badge>
      )
    if (p.status === 'inactive' || !p.is_available)
      return (
        <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700">
          Indisponível
        </Badge>
      )
    if (p.status === 'draft')
      return (
        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">
          Rascunho
        </Badge>
      )
    const promo = getPromoInfo(p)
    if (isPromoActive(p))
      return (
        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">
          Em promoção ({promo.discountPct}%)
        </Badge>
      )
    return (
      <Badge variant="outline" className="text-[10px] bg-blue-50 text-[#1754AE]">
        Ativo
      </Badge>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <StoreIcon className="w-5 h-5 text-[#1754AE]" /> Painel do Comerciante
          </h1>
          <p className="text-xs text-slate-500">
            {store?.name} — gestão de catálogo, promoções e estoque
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCatManagerOpen(true)}
            className="text-xs"
          >
            <FolderTree className="w-3.5 h-3.5 mr-1" /> Categorias
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvImportOpen(true)}
            className="text-xs"
          >
            <FileUp className="w-3.5 h-3.5 mr-1" /> Importar CSV
          </Button>
          <Button
            size="sm"
            onClick={openNew}
            className="bg-[#1754AE] hover:bg-[#12428C] text-white text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo produto
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {lowStockCount > 0 && (
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <TriangleAlert className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-xs font-semibold text-amber-800">Estoque baixo</AlertTitle>
          <AlertDescription className="text-[11px] text-amber-700">
            {lowStockCount} produto(s) atingiram o estoque mínimo. Confira a lista abaixo e reponha.
          </AlertDescription>
        </Alert>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Produtos ativos</p>
            <p className="text-lg font-bold text-slate-900">
              {products.filter((p) => p.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Em promoção</p>
            <p className="text-lg font-bold text-[#E63239]">
              {products.filter((p) => isPromoActive(p)).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Valor em estoque</p>
            <p className="text-lg font-bold text-slate-900">{formatBRL(totalStockValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Pedidos (v0.3)</p>
            <p className="text-lg font-bold text-slate-400">{orders.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca + ações em lote */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código interno, EAN..."
            className="pl-9 text-xs"
          />
        </div>
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => askConfirm('activate')}
            >
              <Power className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Ativar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => askConfirm('deactivate')}
            >
              <Power className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Desativar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => askConfirm('archive')}
            >
              <Archive className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Arquivar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => askConfirm('duplicate')}
            >
              <Copy className="w-3.5 h-3.5 mr-1 text-[#1754AE]" />
              Duplicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-red-600 border-red-200"
              onClick={() => askConfirm('delete')}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Excluir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => setSelected(new Set())}
            >
              Limpar ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {/* Lista de produtos */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#1754AE]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700 mb-1">
              {products.length === 0
                ? 'Nenhum produto cadastrado'
                : 'Nada encontrado para esta busca'}
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Cadastre seu primeiro produto para aparecer na loja virtual.
            </p>
            <Button
              size="sm"
              onClick={openNew}
              className="bg-[#1754AE] hover:bg-[#12428C] text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden md:block rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="text-xs">Produto</TableHead>
                  <TableHead className="text-xs">Preço</TableHead>
                  <TableHead className="text-xs">Estoque</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const eff = getEffectivePrice(p)
                  const low =
                    p.track_stock !== false &&
                    (p.min_stock ?? 0) > 0 &&
                    (p.stock ?? 0) <= (p.min_stock ?? 0)
                  return (
                    <TableRow key={p.id} className={selected.has(p.id) ? 'bg-blue-50/50' : ''}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleOne(p.id)}
                          className="rounded"
                          aria-label={`Selecionar ${p.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.photos?.[0] ? (
                            <img
                              src={photoUrl(p, p.photos[0])}
                              alt=""
                              className="w-9 h-9 rounded object-cover border"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900 truncate max-w-[220px]">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {p.unit}
                              {p.internal_code ? ` · cód. ${p.internal_code}` : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {eff < p.price ? (
                          <div className="text-xs">
                            <span className="line-through text-slate-400 mr-1">
                              {formatBRL(p.price)}
                            </span>
                            <span className="font-bold text-[#E63239]">{formatBRL(eff)}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-900">
                            {formatBRL(p.price)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.track_stock === false ? (
                          <span className="text-[10px] text-slate-400">Sob encomenda</span>
                        ) : (
                          <span
                            className={`text-xs font-semibold ${low ? 'text-amber-600' : 'text-slate-700'}`}
                          >
                            {p.stock ?? 0} {p.unit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(p)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(p)}
                            title="Editar completo"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setStockProduct(p)
                              setStockOpen(true)
                            }}
                            title="Estoque"
                          >
                            <Package className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setDeleting(p)}
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-600 px-1">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleAll}
                className="rounded"
              />
              Selecionar todos ({filtered.length})
            </label>
            {filtered.map((p) => {
              const eff = getEffectivePrice(p)
              const low =
                p.track_stock !== false &&
                (p.min_stock ?? 0) > 0 &&
                (p.stock ?? 0) <= (p.min_stock ?? 0)
              return (
                <Card key={p.id} className={selected.has(p.id) ? 'border-[#1754AE]' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        className="rounded mt-1"
                        aria-label={`Selecionar ${p.name}`}
                      />
                      {p.photos?.[0] ? (
                        <img
                          src={photoUrl(p, p.photos[0])}
                          alt=""
                          className="w-12 h-12 rounded object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900 truncate">{p.name}</p>
                          {statusBadge(p)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {eff < p.price ? (
                            <>
                              <span className="text-[10px] line-through text-slate-400">
                                {formatBRL(p.price)}
                              </span>
                              <span className="text-xs font-bold text-[#E63239]">
                                {formatBRL(eff)}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-slate-900">
                              {formatBRL(p.price)}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">· {p.unit}</span>
                        </div>
                        {p.track_stock !== false && (
                          <p
                            className={`text-[10px] mt-0.5 ${low ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}
                          >
                            Estoque: {p.stock ?? 0}
                            {low ? ' ⚠️ baixo' : ''}
                          </p>
                        )}
                        <div className="flex gap-1.5 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="w-3 h-3 mr-0.5" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() => {
                              setStockProduct(p)
                              setStockOpen(true)
                            }}
                          >
                            <Package className="w-3 h-3 mr-0.5" />
                            Estoque
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2 text-red-600"
                            onClick={() => setDeleting(p)}
                          >
                            <Trash2 className="w-3 h-3 mr-0.5" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Modais */}
      <ProductFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        storeId={store!.id}
        storeCategories={categories}
        editing={editing}
        onSaved={handleSaved}
      />
      <CategoryManagerModal
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
        storeId={store!.id}
        categories={categories}
        onChange={setCategories}
      />
      <StockAdjustModal
        open={stockOpen}
        onOpenChange={setStockOpen}
        product={stockProduct}
        storeId={store!.id}
        onAdjusted={handleStockAdjusted}
      />
      <CSVImportModal
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        storeId={store!.id}
        existing={products}
        categories={categories}
        onImported={async () => {
          const fresh = await getMerchantProducts(store!.id)
          setProducts(fresh)
        }}
      />

      {/* Edição rápida (fotos / variações / complementos) */}
      {quickEdit && (
        <Dialog open={!!quickEdit} onOpenChange={(o) => !o && setQuickEdit(null)}>
          <DialogContent className="max-w-lg bg-white max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900">
                {quickEdit.section === 'photos'
                  ? 'Fotos'
                  : quickEdit.section === 'variations'
                    ? 'Variações'
                    : 'Complementos'}{' '}
                — {quickEdit.product.name}
              </DialogTitle>
            </DialogHeader>
            {quickEdit.section === 'photos' && (
              <PhotosEditor
                editing={quickEdit.product}
                existingPhotos={(quickEdit.product.photos as unknown as string[]) || []}
                setExistingPhotos={(fn) => {
                  const next =
                    typeof fn === 'function'
                      ? fn((quickEdit.product.photos as unknown as string[]) || [])
                      : fn
                  setProducts((prev) =>
                    prev.map((p) => (p.id === quickEdit.product.id ? { ...p, photos: next } : p)),
                  )
                }}
                mainPhoto={(quickEdit.product.main_photo as string) || ''}
                setMainPhoto={(v) => {
                  const val =
                    typeof v === 'function' ? v((quickEdit.product.main_photo as string) || '') : v
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === quickEdit.product.id ? { ...p, main_photo: val } : p,
                    ),
                  )
                }}
                newPhotos={[]}
                setNewPhotos={() => {}}
                uploading={false}
                onUpload={async () => {}}
              />
            )}
            {quickEdit.section === 'variations' && (
              <VariationsEditor
                variations={
                  typeof quickEdit.product.variations === 'string'
                    ? JSON.parse(quickEdit.product.variations || '[]')
                    : quickEdit.product.variations || []
                }
                onChange={(arr) => {
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === quickEdit.product.id ? { ...p, variations: JSON.stringify(arr) } : p,
                    ),
                  )
                }}
              />
            )}
            {quickEdit.section === 'complements' && (
              <ComplementsEditor
                complements={
                  typeof quickEdit.product.complements === 'string'
                    ? JSON.parse(quickEdit.product.complements || '[]')
                    : quickEdit.product.complements || []
                }
                onChange={(arr) => {
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === quickEdit.product.id
                        ? { ...p, complements: JSON.stringify(arr) }
                        : p,
                    ),
                  )
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmação em lote */}
      <Dialog open={!!confirmBulk} onOpenChange={(o) => !o && setConfirmBulk(null)}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Confirmar ação em lote
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selected.size} produto(s) serão{' '}
              {confirmBulk === 'archive'
                ? 'arquivados'
                : confirmBulk === 'activate'
                  ? 'ativados'
                  : confirmBulk === 'deactivate'
                    ? 'desativados'
                    : confirmBulk === 'duplicate'
                      ? 'duplicados como rascunho'
                      : 'processados para exclusão'}
              .
            </DialogDescription>
          </DialogHeader>
          {confirmBulk === 'delete' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Produtos com histórico comercial (pedidos) não são excluídos: são arquivados
              automaticamente.
            </p>
          )}
          {confirmBulk === 'duplicate' && (
            <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2">
              Cada cópia nasce como rascunho, sem código interno/EAN (evita duplicidade) e sem
              promoção.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmBulk(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={applyBulk}
              disabled={bulkBusy}
              className={
                confirmBulk === 'delete'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#1754AE] hover:bg-[#12428C] text-white'
              }
            >
              {bulkBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão única */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">Excluir produto</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              "{deleting?.name}" será excluído. Produtos com histórico comercial são arquivados em
              vez de excluídos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteSingle}
              disabled={bulkBusy}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {bulkBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
