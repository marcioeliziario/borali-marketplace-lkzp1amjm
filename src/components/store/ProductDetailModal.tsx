import React, { useMemo, useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Minus, Plus, ShoppingBag, ImageIcon } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/hooks/use-toast'
import { getPromoInfo, formatBRL, getUnitLabel } from '@/lib/catalog'
import {
  unitPriceFor,
  countSelectedInGroup,
  consumerVariations,
  consumerComplements,
  type SelectedOptions,
} from '@/lib/publicCatalog'
import type { Product, Store } from '@/types'

interface Props {
  product: Product | null
  store: Store | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ProductDetailModal: React.FC<Props> = ({ product, store, open, onOpenChange }) => {
  const { addItem } = useCart()
  const { toast } = useToast()
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null)
  const [selected, setSelected] = useState<SelectedOptions>({})
  const [quantity, setQuantity] = useState(1)

  // Reset das seleções a cada abertura do modal
  useEffect(() => {
    if (open) {
      setSelectedVariation(null)
      setSelected({})
      setQuantity(1)
    }
  }, [open, product?.id])

  const variations = useMemo(() => (product ? consumerVariations(product) : []), [product])
  const complementGroups = useMemo(() => (product ? consumerComplements(product) : []), [product])

  if (!product || !store) return null

  const hasAnySelectionOption =
    variations.length > 0 || complementGroups.some((g) => g.options.length > 0)

  const promoInfo = getPromoInfo(product)
  const promoActive = promoInfo.hasPromo && !promoInfo.expired && !promoInfo.notStarted
  const unitPrice = unitPriceFor(product, selectedVariation, selected)

  const toggleOption = (groupId: string, optionId: string, groupMax: number) => {
    setSelected((prev) => {
      const current = prev[groupId] ?? []
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) }
      }
      // Respeitar o limite máximo do grupo
      const next = current.length >= groupMax ? current.slice(1) : current
      return { ...prev, [groupId]: [...next, optionId] }
    })
  }

  const validateComplements = (): string | null => {
    for (const group of complementGroups) {
      const count = countSelectedInGroup(selected, group.id)
      if (group.required && count < group.min) {
        return `Selecione ao menos ${group.min} opção em "${group.name}".`
      }
      if (count < group.min && count > 0) {
        return `Selecione ao menos ${group.min} opções em "${group.name}".`
      }
    }
    return null
  }

  const handleAdd = () => {
    const error = validateComplements()
    if (error) {
      toast({ title: 'Atenção', description: error, variant: 'destructive' })
      return
    }
    addItem(product, store, quantity, selectedVariation, selected)
    toast({
      title: 'Adicionado ao carrinho',
      description: `${quantity}x ${product.name} — ${formatBRL(unitPrice * quantity)}`,
    })
    onOpenChange(false)
  }

  const mainPhoto = product.main_photo || product.image_url || null
  const gallery = product.photos?.length ? product.photos : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        <ScrollArea className="flex-1 max-h-[calc(85vh-80px)]">
          <div className="space-y-4">
            {/* FOTO / GALERIA */}
            <div className="bg-slate-100 relative flex items-center justify-center aspect-[4/3] overflow-hidden">
              {mainPhoto ? (
                <img src={mainPhoto} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-300 flex flex-col items-center gap-2">
                  <ImageIcon className="w-12 h-12" />
                  <span className="text-xs">Sem foto</span>
                </div>
              )}
              {gallery.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 px-4 overflow-x-auto">
                  {gallery.slice(0, 6).map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`${product.name} — foto ${i + 1}`}
                      className="w-12 h-12 object-cover rounded border-2 border-white shadow-sm cursor-pointer hover:opacity-80"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 pb-5 space-y-4">
              <DialogHeader className="space-y-2">
                <div className="flex items-start gap-2">
                  <DialogTitle className="text-lg font-extrabold text-slate-900 leading-snug">
                    {product.name}
                  </DialogTitle>
                  {product.is_demo && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-red-50 text-red-700 border-red-300 font-bold flex-shrink-0 mt-1"
                    >
                      DEMO
                    </Badge>
                  )}
                </div>
                {product.description && (
                  <DialogDescription className="text-xs text-slate-500">
                    {product.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              {product.description_full && (
                <p className="text-xs text-slate-600 leading-relaxed">{product.description_full}</p>
              )}

              {/* PREÇO */}
              <div className="flex items-baseline gap-3">
                {promoActive && (
                  <>
                    <span className="text-sm text-slate-400 line-through">
                      {formatBRL(Number(product.price))}
                    </span>
                    <Badge className="bg-[#E63239] text-white text-[10px] font-bold">
                      -{promoInfo.discountPct}%
                    </Badge>
                  </>
                )}
                <span className="text-2xl font-extrabold text-[#1754AE]">
                  {formatBRL(unitPrice)}
                </span>
                <span className="text-[11px] text-slate-400">
                  / {getUnitLabel(product.unit, product.custom_unit)}
                </span>
              </div>

              {product.is_regulated && (
                <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded font-medium">
                  Regulamentado: venda proibida para menores de 18 anos.
                </p>
              )}

              {/* VARIAÇÕES */}
              {!hasAnySelectionOption && product.track_stock !== false && product.stock <= 0 && (
                <p className="text-xs font-semibold text-[#E63239] bg-red-50 rounded-lg p-2.5">
                  Produto temporariamente indisponível
                </p>
              )}
              {/* VARIAÇÕES */}
              {variations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Escolha uma opção
                  </h4>
                  <RadioGroup
                    value={selectedVariation ?? ''}
                    onValueChange={(value) => setSelectedVariation(value)}
                    className="space-y-1.5"
                  >
                    {variations.map((variation) => (
                      <div
                        key={variation.key}
                        className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-2.5 hover:border-[#1754AE]/40 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <RadioGroupItem value={variation.key} id={`v-${variation.key}`} />
                          <Label
                            htmlFor={`v-${variation.key}`}
                            className="text-xs font-medium text-slate-800 cursor-pointer"
                          >
                            {variation.name}
                          </Label>
                        </div>
                        <span className="text-xs font-bold text-[#1754AE]">
                          {formatBRL(variation.price)}
                        </span>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* COMPLEMENTOS */}
              {complementGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    {group.name}
                    {group.required ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-red-50 text-[#E63239] border-red-200 font-bold"
                      >
                        Obrigatório
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-slate-100 text-slate-500 border-slate-200 font-medium"
                      >
                        Opcional
                      </Badge>
                    )}
                  </h4>
                  {group.options.map((option) => {
                    const checked = (selected[group.id] ?? []).includes(option.id)
                    return (
                      <div
                        key={option.id}
                        className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-2.5 hover:border-[#1754AE]/40 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            id={`c-${group.id}-${option.id}`}
                            checked={checked}
                            onCheckedChange={() => toggleOption(group.id, option.id, group.max)}
                          />
                          <Label
                            htmlFor={`c-${group.id}-${option.id}`}
                            className="text-xs font-medium text-slate-800 cursor-pointer"
                          >
                            {option.name}
                          </Label>
                        </div>
                        <span className="text-xs text-slate-500">
                          {option.price > 0 ? `+ ${formatBRL(option.price)}` : 'Grátis'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* RODAPÉ FIXO: QUANTIDADE + ADICIONAR */}
        <div className="border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-7 h-7 rounded bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 transition"
              aria-label="Diminuir quantidade"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-7 h-7 rounded bg-[#1754AE] text-white flex items-center justify-center hover:bg-[#12428C] transition"
              aria-label="Aumentar quantidade"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button
            onClick={handleAdd}
            className="bg-[#1754AE] hover:bg-[#12428C] text-white text-xs font-bold h-9 px-4 rounded-lg flex-1 max-w-[220px]"
          >
            <ShoppingBag className="w-4 h-4 mr-1.5" />
            Adicionar {formatBRL(unitPrice * quantity)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductDetailModal
