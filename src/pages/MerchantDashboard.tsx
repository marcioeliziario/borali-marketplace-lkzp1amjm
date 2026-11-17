import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store,
  Package,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Bike,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Settings,
  ShoppingBag,
  Info,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getStoreById,
  getMerchantProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStore,
  getStoreOrders,
  logAudit,
  getCategories,
} from '@/services/api'
import { Store as StoreType, Product, Category, Order, ProductUnit } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export const MerchantDashboard: React.FC = () => {
  const { user, isMerchant, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [store, setStore] = useState<StoreType | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal de Produto
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Form State Produto
  const [prodName, setProdName] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodPromoPrice, setProdPromoPrice] = useState('')
  const [prodUnit, setProdUnit] = useState<ProductUnit>('un')
  const [prodStock, setProdStock] = useState('')
  const [prodCategory, setProdCategory] = useState('')
  const [prodBarcode, setProdBarcode] = useState('')
  const [prodIsDemo, setProdIsDemo] = useState(false)
  const [prodIsRegulated, setProdIsRegulated] = useState(false)
  const [prodBrand, setProdBrand] = useState('')
  const [isSavingProduct, setIsSavingProduct] = useState(false)

  // Form State Configurações da Loja
  const [deliveryFee, setDeliveryFee] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [estimatedTime, setEstimatedTime] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Carregar dados da loja vinculada ao usuário
  useEffect(() => {
    async function loadData() {
      // Regra de segurança: comerciante só vê a própria loja; admin pode visualizar se tiver store_id ou primeira loja
      const storeId = user?.store_id

      if (!storeId && !isAdmin) {
        setIsLoading(false)
        return
      }

      // Se for admin testando sem store_id, busca a loja piloto Distribuidora Barbosa para inspeção
      const targetStoreId = storeId || 'zc5y4y12z243toe'

      setIsLoading(true)
      const [storeData, prods, cats, ords] = await Promise.all([
        getStoreById(targetStoreId),
        getMerchantProducts(targetStoreId),
        getCategories(),
        getStoreOrders(targetStoreId),
      ])

      if (storeData) {
        setStore(storeData)
        setDeliveryFee(storeData.delivery_fee ? String(storeData.delivery_fee) : '')
        setMinOrder(storeData.min_order_value ? String(storeData.min_order_value) : '')
        setEstimatedTime(storeData.estimated_time || '')
        setPhone(storeData.phone || '')
        setWhatsapp(storeData.whatsapp || '')
      }

      setProducts(prods)
      setCategories(cats)
      setOrders(ords)
      setIsLoading(false)
    }

    loadData()
  }, [user, isAdmin])

  // Abrir modal para novo produto
  const handleOpenNewProduct = () => {
    setEditingProduct(null)
    setProdName('')
    setProdDesc('')
    setProdPrice('')
    setProdPromoPrice('')
    setProdUnit('un')
    setProdStock('10')
    setProdCategory(categories[0]?.id || '')
    setProdBarcode('')
    setProdIsDemo(true) // Default com marcação no piloto
    setProdIsRegulated(false)
    setProdBrand('')
    setIsProductModalOpen(true)
  }

  // Abrir modal para edição de produto
  const handleEditProduct = (prod: Product) => {
    setEditingProduct(prod)
    setProdName(prod.name)
    setProdDesc(prod.description || '')
    setProdPrice(String(prod.price))
    setProdPromoPrice(prod.promo_price ? String(prod.promo_price) : '')
    setProdUnit(prod.unit)
    setProdStock(prod.stock !== undefined ? String(prod.stock) : '0')
    setProdCategory(prod.category_id || '')
    setProdBarcode(prod.barcode || '')
    setProdIsDemo(prod.is_demo || false)
    setProdIsRegulated(prod.is_regulated || false)
    setProdBrand(prod.brand || '')
    setIsProductModalOpen(true)
  }

  // Salvar produto (criar ou atualizar)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return

    setIsSavingProduct(true)
    try {
      const payload: Partial<Product> = {
        store_id: store.id,
        category_id: prodCategory || undefined,
        name: prodName,
        description: prodDesc,
        price: parseFloat(prodPrice) || 0,
        promo_price: prodPromoPrice ? parseFloat(prodPromoPrice) : undefined,
        unit: prodUnit,
        stock: parseInt(prodStock, 10) || 0,
        barcode: prodBarcode,
        brand: prodBrand,
        is_demo: prodIsDemo,
        is_regulated: prodIsRegulated,
        is_available: true,
        status: 'active',
      }

      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, payload)
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        logAudit('product.updated', 'products', updated.id, { name: updated.name })
        toast({ title: 'Produto atualizado com sucesso!' })
      } else {
        const created = await createProduct(payload)
        setProducts((prev) => [created, ...prev])
        logAudit('product.created', 'products', created.id, { name: created.name })
        toast({ title: 'Produto cadastrado com sucesso!' })
      }

      setIsProductModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar produto',
        description: err?.message || 'Falha de validação ou permissão.',
      })
    } finally {
      setIsSavingProduct(false)
    }
  }

  // Excluir produto
  const handleDeleteProduct = async (prod: Product) => {
    if (!window.confirm(`Deseja realmente remover o produto "${prod.name}"?`)) return
    try {
      await deleteProduct(prod.id)
      setProducts((prev) => prev.filter((p) => p.id !== prod.id))
      logAudit('product.deleted', 'products', prod.id, { name: prod.name })
      toast({ title: 'Produto excluído com sucesso.' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err?.message,
      })
    }
  }

  // Salvar configurações comerciais da loja
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return

    setIsSavingSettings(true)
    try {
      const updated = await updateStore(store.id, {
        delivery_fee: deliveryFee ? parseFloat(deliveryFee) : 0,
        min_order_value: minOrder ? parseFloat(minOrder) : 0,
        estimated_time: estimatedTime,
        phone,
        whatsapp,
      })
      setStore(updated)
      logAudit('store.settings_updated', 'stores', store.id)
      toast({ title: 'Configurações da loja salvas com sucesso!' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar configurações',
        description: err?.message,
      })
    } finally {
      setIsSavingSettings(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-[#1754AE] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Carregando painel do comerciante...</p>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-sm space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Nenhum estabelecimento vinculado</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sua conta de usuário não possui vínculo com nenhuma loja ativa. Entre em contato com o
            administrador geral da plataforma Borali.
          </p>
          <Button onClick={() => navigate('/obidos')} className="bg-[#1754AE] text-xs">
            Voltar para o Marketplace
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* CABEÇALHO DO PAINEL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1754AE] flex items-center justify-center border border-blue-100 flex-shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{store.name}</h1>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  {store.status === 'approved' ? 'Aprovada' : store.status}
                </Badge>
                {store.is_demo && (
                  <Badge
                    variant="outline"
                    className="bg-red-50 text-red-700 border-red-300 text-xs font-bold"
                  >
                    PILOTO DEMO
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Painel de Gestão da Loja Virtual • {store.address_neighborhood || 'Centro'},
                Óbidos/PA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/obidos/${store.slug}`)}
              className="text-xs"
            >
              Ver Minha Loja Virtual
            </Button>
            <Button
              size="sm"
              onClick={handleOpenNewProduct}
              className="bg-[#1754AE] hover:bg-[#12428C] text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Produto
            </Button>
          </div>
        </div>

        {/* METRICS CARDS (Visão Geral da v0.1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Produtos no Catálogo</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{products.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1754AE] flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Taxa de Entrega</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  R${' '}
                  {Number(store.delivery_fee || 0)
                    .toFixed(2)
                    .replace('.', ',')}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Bike className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Tempo Médio</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {store.estimated_time || '30-50 min'}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Pedidos (Estrutura)</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{orders.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ABAS DO PAINEL DO COMERCIANTE */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm mb-6">
            <TabsTrigger value="products" className="text-xs font-semibold px-4 py-2">
              <Package className="w-4 h-4 mr-1.5" />
              Produtos & Estoque
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs font-semibold px-4 py-2">
              <ShoppingBag className="w-4 h-4 mr-1.5" />
              Pedidos (Estrutura v0.1)
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs font-semibold px-4 py-2">
              <Settings className="w-4 h-4 mr-1.5" />
              Configurações & Entrega
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PRODUTOS & ESTOQUE */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Catálogo de Produtos</h3>
                <p className="text-xs text-slate-500">
                  Gerencie preços, estoque, unidades de medida e status dos seus itens
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleOpenNewProduct}
                className="bg-[#1754AE] text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar Produto
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Produto</th>
                      <th className="p-4">Unidade</th>
                      <th className="p-4">Preço Normal</th>
                      <th className="p-4">Preço Promo</th>
                      <th className="p-4">Estoque</th>
                      <th className="p-4">Tags</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Nenhum produto cadastrado ainda. Clique em "Novo Produto" para iniciar.
                        </td>
                      </tr>
                    ) : (
                      products.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-50 transition">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{prod.name}</div>
                            {prod.description && (
                              <div className="text-[11px] text-slate-400 line-clamp-1">
                                {prod.description}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono font-medium">{prod.unit}</td>
                          <td className="p-4 font-medium">
                            R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                          </td>
                          <td className="p-4">
                            {prod.promo_price ? (
                              <span className="font-bold text-[#E63239]">
                                R$ {Number(prod.promo_price).toFixed(2).replace('.', ',')}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-4 font-semibold">{prod.stock ?? 0}</td>
                          <td className="p-4 space-x-1">
                            {prod.is_demo && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-red-50 text-red-700 border-red-200 font-bold"
                              >
                                DEMO
                              </Badge>
                            )}
                            {prod.is_regulated && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                              >
                                Regulado
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(prod)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(prod)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: PEDIDOS (ESTRUTURA V0.1) */}
          <TabsContent value="orders" className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
              <Info className="w-5 h-5 text-[#1754AE] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <strong>Estrutura de Pedidos v0.1:</strong> O modelo de dados completo de pedidos
                (identificação única, status: Aguardando confirmação, Confirmado, Em preparação,
                Pronto para retirada, Saiu para entrega, Entregue, Cancelado) está implementado e
                isolado por loja. Os fluxos interativos de finalização de compra e disparo de
                pedidos entram na rodada <strong>v0.3</strong>.
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">
                Nenhum pedido recebido no momento
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Assim que os clientes realizarem pedidos na sua loja virtual, eles aparecerão aqui
                com status em tempo real.
              </p>
            </div>
          </TabsContent>

          {/* TAB 3: CONFIGURAÇÕES & ENTREGA */}
          <TabsContent value="settings">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">
                  Configurações Comerciais e Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveStoreSettings} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Taxa de Entrega Padrão (R$)
                      </Label>
                      <Input
                        type="number"
                        step="0.50"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Pedido Mínimo (R$)
                      </Label>
                      <Input
                        type="number"
                        step="1.00"
                        value={minOrder}
                        onChange={(e) => setMinOrder(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Tempo Estimado de Entrega
                    </Label>
                    <Input
                      type="text"
                      placeholder="ex: 30-50 min"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Telefone Comercial
                      </Label>
                      <Input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        WhatsApp para Pedidos
                      </Label>
                      <Input
                        type="text"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSavingSettings}
                    className="bg-[#1754AE] hover:bg-[#12428C] text-white text-xs font-bold"
                  >
                    {isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE PRODUTO */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Preencha os dados do produto conforme as especificações de comércio local.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome do Produto *</Label>
              <Input
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="ex: [DEMO] Água Mineral 500ml"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Descrição</Label>
              <Input
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                placeholder="Breve descrição do produto"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Preço Normal (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  placeholder="0,00"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Preço Promocional (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={prodPromoPrice}
                  onChange={(e) => setProdPromoPrice(e.target.value)}
                  placeholder="Opcional"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Unidade de Medida *</Label>
                <select
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value as ProductUnit)}
                  className="w-full h-9 rounded-md border border-slate-200 text-xs px-2 bg-white"
                >
                  <option value="un">Unidade (un)</option>
                  <option value="kg">Quilo (kg)</option>
                  <option value="g">Grama (g)</option>
                  <option value="l">Litro (l)</option>
                  <option value="ml">Mililitro (ml)</option>
                  <option value="cx">Caixa (cx)</option>
                  <option value="pct">Pacote (pct)</option>
                  <option value="fardo">Fardo (fardo)</option>
                  <option value="duzia">Dúzia (duzia)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Estoque</Label>
                <Input
                  type="number"
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                  placeholder="0"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Código de Barras</Label>
                <Input
                  value={prodBarcode}
                  onChange={(e) => setProdBarcode(e.target.value)}
                  placeholder="Opcional (EAN)"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Marca</Label>
                <Input
                  value={prodBrand}
                  onChange={(e) => setProdBrand(e.target.value)}
                  placeholder="ex: Piloto Regional"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodIsDemo}
                  onChange={(e) => setProdIsDemo(e.target.checked)}
                  className="rounded text-[#1754AE]"
                />
                <span>Identificar claramente como Dado Demonstrativo (DEMO)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodIsRegulated}
                  onChange={(e) => setProdIsRegulated(e.target.checked)}
                  className="rounded text-[#1754AE]"
                />
                <span>Produto sujeito a regulamentação (ex: bebidas alcoólicas)</span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProductModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingProduct}
                className="bg-[#1754AE] text-white"
              >
                {isSavingProduct ? 'Salvando...' : 'Salvar Produto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MerchantDashboard
