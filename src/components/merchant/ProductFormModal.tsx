import React, { useEffect, useMemo, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import type { Product, StoreCategory } from '@/types'
import { UNITS, formatBRL } from '@/lib/catalog'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { VariationsEditor } from './VariationsEditor'
import { ComplementsEditor } from './ComplementsEditor'
import { PhotosEditor } from './PhotosEditor'
import { Loader2, Save } from 'lucide-react'

export interface ProductFormValues {
  name: string
  description: string
  description_full: string
  brand: string
  store_category_id: string
  subcategory: string
  internal_code: string
  barcode: string
  unit: string
  custom_unit: string
  status: string
  price: number
  promo_price: number
  promo_starts_date: string
  promo_ends_date: string
  stock: number
  min_stock: number
  track_stock: boolean
  is_available: boolean
  allow_fractional: boolean
  estimated_weight: number
  final_weight: number
  lot: string
  is_demo: boolean
  is_regulated: boolean
  variations: unknown[]
  complements: unknown[]
}

export function emptyProductForm(): ProductFormValues {
  return {
    name: '',
    description: '',
    description_full: '',
    brand: '',
    store_category_id: '',
    subcategory: '',
    internal_code: '',
    barcode: '',
    unit: 'un',
    custom_unit: '',
    status: 'active',
    price: 0,
    promo_price: 0,
    promo_starts_date: '',
    promo_ends_date: '',
    stock: 0,
    min_stock: 0,
    track_stock: true,
    is_available: true,
    allow_fractional: false,
    estimated_weight: 0,
    final_weight: 0,
    lot: '',
    is_demo: true,
    is_regulated: false,
    variations: [],
    complements: [],
  }
}

const toInputDate = (v?: string | number | null): string => {
  if (!v) return ''
  const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const fromInputDate = (v: string): number => {
  if (!v) return 0
  return Math.floor(new Date(v + 'T12:00:00').getTime() / 1000)
}

export function formValuesToPayload(v: ProductFormValues): Record<string, unknown> {
  const promo = v.promo_price > 0 && v.promo_price < v.price
  return {
    name: v.name,
    description: v.description,
    description_full: v.description_full,
    brand: v.brand,
    store_category_id: v.store_category_id || undefined,
    subcategory: v.subcategory,
    internal_code: v.internal_code,
    barcode: v.barcode,
    unit: v.unit,
    custom_unit: v.unit === 'custom' ? v.custom_unit : '',
    status: v.status,
    price: v.price,
    promo_price: promo ? v.promo_price : 0,
    promo_starts_at: promo && v.promo_starts_date ? fromInputDate(v.promo_starts_date) : 0,
    promo_ends_at: promo && v.promo_ends_date ? fromInputDate(v.promo_ends_date) : 0,
    stock: v.track_stock ? v.stock : 0,
    min_stock: v.track_stock ? v.min_stock : 0,
    track_stock: v.track_stock,
    is_available: v.is_available,
    allow_fractional: v.allow_fractional,
    estimated_weight: v.estimated_weight || undefined,
    final_weight: v.final_weight || undefined,
    lot: v.lot,
    variations: JSON.stringify(v.variations),
    complements: JSON.stringify(v.complements),
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  storeCategories: StoreCategory[]
  editing: Product | null
  onSaved: (product: Product, isEdit: boolean) => void
}

export const ProductFormModal: React.FC<Props> = ({
  open,
  onOpenChange,
  storeId,
  storeCategories,
  editing,
  onSaved,
}) => {
  const { toast } = useToast()
  const [v, setV] = useState<ProductFormValues>(emptyProductForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  const [mainPhoto, setMainPhoto] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setV({
        ...emptyProductForm(),
        name: editing.name,
        description: editing.description || '',
        description_full: editing.description_full || '',
        brand: editing.brand || '',
        store_category_id: editing.store_category_id || '',
        subcategory: editing.subcategory || '',
        internal_code: editing.internal_code || '',
        barcode: editing.barcode || '',
        unit: editing.custom_unit ? 'custom' : editing.unit,
        custom_unit: editing.custom_unit || '',
        status: editing.status,
        price: editing.price,
        promo_price: editing.promo_price || 0,
        promo_starts_date: toInputDate(editing.promo_starts_at),
        promo_ends_date: toInputDate(editing.promo_ends_at),
        stock: editing.stock ?? 0,
        min_stock: editing.min_stock ?? 0,
        track_stock: editing.track_stock !== false,
        is_available: editing.is_available,
        allow_fractional: !!editing.allow_fractional,
        estimated_weight: editing.estimated_weight || 0,
        final_weight: editing.final_weight || 0,
        lot: editing.lot || '',
        is_demo: !!editing.is_demo,
        is_regulated: !!editing.is_regulated,
        variations:
          typeof editing.variations === 'string'
            ? JSON.parse(editing.variations || '[]')
            : editing.variations || [],
        complements:
          typeof editing.complements === 'string'
            ? JSON.parse(editing.complements || '[]')
            : editing.complements || [],
      })
      const photos = (editing.photos as unknown as string[]) || []
      setExistingPhotos(photos)
      setMainPhoto(editing.main_photo || photos[0] || '')
      setNewPhotos([])
    } else {
      setV(emptyProductForm())
      setExistingPhotos([])
      setMainPhoto('')
      setNewPhotos([])
    }
  }, [open, editing])

  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }))

  const promoPreview = useMemo(() => {
    if (v.price <= 0 || v.promo_price <= 0 || v.promo_price >= v.price) return null
    const pct = Math.round(((v.price - v.promo_price) / v.price) * 100)
    return { pct, price: v.promo_price }
  }, [v.price, v.promo_price])

  const handlePhotoUpload = async () => {
    if (newPhotos.length === 0) return
    setUploading(true)
    try {
      const formData = new FormData()
      newPhotos.forEach((f) => formData.append('photos', f))
      if (editing) {
        formData.append('existing', existingPhotos.join(','))
        await pb.collection('products').update(editing.id, formData)
      }
      toast({ title: 'Fotos enviadas', description: `${newPhotos.length} foto(s) adicionada(s).` })
      setNewPhotos([])
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description:
          err instanceof Error
            ? err.message
            : 'Verifique tipo (JPG/PNG/WebP) e tamanho (máx. 5 MB).',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!v.name.trim()) {
      toast({ variant: 'destructive', title: 'Informe o nome do produto' })
      return
    }
    if (v.price <= 0) {
      toast({ variant: 'destructive', title: 'Informe um preço maior que zero' })
      return
    }
    if (v.promo_price > 0 && v.promo_price >= v.price) {
      toast({
        variant: 'destructive',
        title: 'Preço promocional inválido',
        description: 'A promoção deve ser MENOR que o preço normal.',
      })
      return
    }
    setSaving(true)
    try {
      const payload = formValuesToPayload(v)
      let saved: Product
      if (editing) {
        saved = await pb.collection('products').update<Product>(editing.id, payload)
      } else {
        saved = await pb.collection('products').create<Product>({
          store_id: storeId,
          is_demo: v.is_demo,
          is_regulated: v.is_regulated,
          ...payload,
        })
      }

      // 2. Upload das fotos novas (após criar/atualizar)
      if (newPhotos.length > 0) {
        const formData = new FormData()
        newPhotos.forEach((f) => formData.append('photos', f))
        await pb.collection('products').update(saved.id, formData)
      }

      onSaved(saved, !!editing)
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar produto',
        description: err instanceof Error ? err.message : 'Falha de validação ou permissão.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            {editing ? 'Editar Produto' : 'Cadastrar Novo Produto'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Preencha as seções abaixo. Só o nome, preço e unidade são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="w-full flex-wrap h-auto gap-1">
              <TabsTrigger value="geral" className="text-xs">
                Informações
              </TabsTrigger>
              <TabsTrigger value="fotos" className="text-xs">
                Fotos
              </TabsTrigger>
              <TabsTrigger value="precos" className="text-xs">
                Preços
              </TabsTrigger>
              <TabsTrigger value="estoque" className="text-xs">
                Estoque
              </TabsTrigger>
              <TabsTrigger value="variacoes" className="text-xs">
                Variações
              </TabsTrigger>
              <TabsTrigger value="complementos" className="text-xs">
                Complementos
              </TabsTrigger>
              <TabsTrigger value="extras" className="text-xs">
                Lote/Peso
              </TabsTrigger>
            </TabsList>

            {/* (a) INFORMAÇÕES GERAIS */}
            <TabsContent value="geral" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome do produto *</Label>
                <Input
                  required
                  value={v.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="text-xs"
                  placeholder="ex: [DEMO] Água Mineral 500ml"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Descrição curta</Label>
                <Input
                  value={v.description}
                  onChange={(e) => set('description', e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Descrição completa</Label>
                <textarea
                  value={v.description_full}
                  onChange={(e) => set('description_full', e.target.value)}
                  className="w-full min-h-[70px] rounded-md border border-slate-200 text-xs px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Marca</Label>
                  <Input
                    value={v.brand}
                    onChange={(e) => set('brand', e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Categoria interna</Label>
                  <select
                    value={v.store_category_id}
                    onChange={(e) => set('store_category_id', e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 text-xs px-2 bg-white"
                  >
                    <option value="">Sem categoria</option>
                    {storeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Subcategoria</Label>
                  <Input
                    value={v.subcategory}
                    onChange={(e) => set('subcategory', e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Status</Label>
                  <select
                    value={v.status}
                    onChange={(e) => set('status', e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 text-xs px-2 bg-white"
                  >
                    <option value="active">Ativo (visível na loja)</option>
                    <option value="inactive">Inativo (oculto)</option>
                    <option value="draft">Rascunho</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Código interno</Label>
                  <Input
                    value={v.internal_code}
                    onChange={(e) => set('internal_code', e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Código de barras (EAN)</Label>
                  <Input
                    value={v.barcode}
                    onChange={(e) => set('barcode', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Unidade de medida *</Label>
                  <select
                    value={v.unit}
                    onChange={(e) => set('unit', e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 text-xs px-2 bg-white"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                    <option value="custom">Outra (personalizada)</option>
                  </select>
                </div>
                {v.unit === 'custom' && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Unidade personalizada</Label>
                    <Input
                      value={v.custom_unit}
                      onChange={(e) => set('custom_unit', e.target.value)}
                      className="text-xs"
                      placeholder="ex: saco, balde"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* (b) FOTOGRAFIAS */}
            <TabsContent value="fotos" className="space-y-3 pt-3">
              {!editing && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Salve o produto primeiro para escolher a foto principal. O upload já funciona na
                  criação.
                </p>
              )}
              <PhotosEditor
                editing={editing}
                existingPhotos={existingPhotos}
                setExistingPhotos={setExistingPhotos}
                mainPhoto={mainPhoto}
                setMainPhoto={setMainPhoto}
                newPhotos={newPhotos}
                setNewPhotos={setNewPhotos}
                uploading={uploading}
                onUpload={handlePhotoUpload}
              />
            </TabsContent>

            {/* (c) PREÇOS E PROMOÇÕES */}
            <TabsContent value="precos" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Preço normal (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={v.price || ''}
                    onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Preço promocional (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={v.promo_price || ''}
                    onChange={(e) => set('promo_price', parseFloat(e.target.value) || 0)}
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Promoção começa em</Label>
                  <Input
                    type="date"
                    value={v.promo_starts_date}
                    onChange={(e) => set('promo_starts_date', e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Promoção termina em</Label>
                  <Input
                    type="date"
                    value={v.promo_ends_date}
                    onChange={(e) => set('promo_ends_date', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              {promoPreview && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                  Promoção válida: {promoPreview.pct}% de desconto — cliente pagará R${' '}
                  {promoPreview.price.toFixed(2).replace('.', ',')}.
                </p>
              )}
              {v.promo_price > 0 && v.promo_price >= v.price && (
                <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                  O preço promocional deve ser MENOR que o preço normal.
                </p>
              )}
            </TabsContent>

            {/* (d) ESTOQUE E DISPONIBILIDADE */}
            <TabsContent value="estoque" className="space-y-3 pt-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <Label className="text-xs font-semibold">Controlar estoque</Label>
                  <p className="text-[11px] text-slate-500">
                    Desligue para produtos sob encomenda ou feitos na hora.
                  </p>
                </div>
                <Switch checked={v.track_stock} onCheckedChange={(c) => set('track_stock', c)} />
              </div>
              {v.track_stock && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Quantidade em estoque</Label>
                    <Input
                      type="number"
                      value={v.stock || ''}
                      onChange={(e) => set('stock', parseInt(e.target.value, 10) || 0)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Estoque mínimo (alerta)</Label>
                    <Input
                      type="number"
                      value={v.min_stock || ''}
                      onChange={(e) => set('min_stock', parseInt(e.target.value, 10) || 0)}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <Label className="text-xs font-semibold">Disponível para venda</Label>
                  <p className="text-[11px] text-slate-500">
                    Produtos indisponíveis não aparecem no carrinho.
                  </p>
                </div>
                <Switch checked={v.is_available} onCheckedChange={(c) => set('is_available', c)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <Label className="text-xs font-semibold">Permitir quantidade fracionada</Label>
                  <p className="text-[11px] text-slate-500">Ex: 0,5 kg de queijo.</p>
                </div>
                <Switch
                  checked={v.allow_fractional}
                  onCheckedChange={(c) => set('allow_fractional', c)}
                />
              </div>
            </TabsContent>

            {/* (e) VARIAÇÕES */}
            <TabsContent value="variacoes" className="pt-3">
              <VariationsEditor
                variations={v.variations}
                onChange={(arr) => set('variations', arr)}
              />
            </TabsContent>

            {/* (f) COMPLEMENTOS */}
            <TabsContent value="complementos" className="pt-3">
              <ComplementsEditor
                complements={v.complements}
                onChange={(arr) => set('complements', arr)}
              />
            </TabsContent>

            {/* (g) LOTE, VALIDADE E PESO */}
            <TabsContent value="extras" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Lote</Label>
                <Input
                  value={v.lot}
                  onChange={(e) => set('lot', e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Peso estimado (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={v.estimated_weight || ''}
                    onChange={(e) => set('estimated_weight', parseFloat(e.target.value) || 0)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Peso final (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={v.final_weight || ''}
                    onChange={(e) => set('final_weight', parseFloat(e.target.value) || 0)}
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={v.is_demo}
                  onChange={(e) => set('is_demo', e.target.checked)}
                  className="rounded"
                  id="f-demo"
                />
                <label htmlFor="f-demo" className="text-xs text-slate-700">
                  Marcar como dado demonstrativo [DEMO]
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={v.is_regulated}
                  onChange={(e) => set('is_regulated', e.target.checked)}
                  className="rounded"
                  id="f-reg"
                />
                <label htmlFor="f-reg" className="text-xs text-slate-700">
                  Produto regulado (ex: bebida alcoólica)
                </label>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || uploading}
              className="bg-[#1754AE] hover:bg-[#12428C] text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Salvar Produto
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// re-export para uso externo (badge de preço vigente no painel)
export { getEffectivePrice }
