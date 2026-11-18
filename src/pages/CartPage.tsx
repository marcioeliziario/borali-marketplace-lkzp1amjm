import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus, Store, Bike, AlertCircle } from 'lucide-react'
import { useCart, lineUnitPrice } from '@/contexts/CartContext'
import { getPromoInfo, formatBRL } from '@/lib/catalog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const CartPage: React.FC = () => {
  const navigate = useNavigate()
  const { cartStore, items, updateQuantity, removeItem, clearCart, totalAmount, totalCount } =
    useCart()

  if (items.length === 0 || !cartStore) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] py-16 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Seu carrinho está vazio</h2>
          <p className="text-xs text-slate-500">
            Adicione produtos de uma loja para montar seu pedido em Óbidos.
          </p>
          <Button
            onClick={() => navigate('/obidos')}
            className="bg-[#1754AE] text-white text-xs font-semibold"
          >
            Ver Estabelecimentos
          </Button>
        </div>
      </div>
    )
  }

  const deliveryFee = Number(cartStore.delivery_fee) || 0
  const finalTotal = totalAmount + deliveryFee

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-8 px-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Esvaziar Carrinho
          </Button>
        </div>

        {/* LOJA DO CARRINHO (Regra: 1 loja por pedido) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1754AE] flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Pedido para:</p>
              <h3 className="font-bold text-sm text-slate-900">{cartStore.name}</h3>
            </div>
          </div>
          <Link to={`/${cartStore.expand?.city_id?.slug || 'obidos'}/${cartStore.slug}`}>
            <Button variant="outline" size="sm" className="text-xs">
              Ver Catálogo
            </Button>
          </Link>
        </div>

        {/* LISTA DE ITENS */}
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 font-bold text-xs text-slate-700 flex justify-between">
            <span>Itens Selecionados ({totalCount})</span>
            <span>Subtotal</span>
          </div>

          {items.map((item) => {
            const promoInfo = getPromoInfo(item.product)
            const promoActive = promoInfo.hasPromo && !promoInfo.expired && !promoInfo.notStarted
            const unitPrice = lineUnitPrice(item)
            const basePrice = item.product.price
            return (
              <div key={item.lineId} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-900">{item.product.name}</h4>
                    {item.product.is_demo && (
                      <Badge
                        variant="outline"
                        className="text-[9px] bg-red-50 text-red-700 border-red-200"
                      >
                        DEMO
                      </Badge>
                    )}
                  </div>
                  {/* detalhes da linha: variação e complementos selecionados */}
                  {item.selection?.variationName && (
                    <p className="text-[11px] text-slate-500">{item.selection.variationName}</p>
                  )}
                  {(item.selection?.complementNames?.length ?? 0) > 0 && (
                    <p className="text-[11px] text-slate-400">
                      + {item.selection!.complementNames!.join(', ')}
                    </p>
                  )}
                  {promoActive ? (
                    <p className="text-[11px] text-slate-400">
                      <span className="line-through">{formatBRL(basePrice)}</span>{' '}
                      <span className="text-[#E63239] font-bold">{formatBRL(unitPrice)}</span> por{' '}
                      {item.product.unit || 'un'}
                      {promoInfo.discountPct > 0 && (
                        <span className="ml-1 text-[#E63239]">-{promoInfo.discountPct}%</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      {formatBRL(unitPrice)} por {item.product.unit || 'un'}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-[#1754AE] text-white flex items-center justify-center hover:bg-[#12428C]"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold text-xs text-slate-900 w-16 text-right">
                    {formatBRL(unitPrice * item.quantity)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* RESUMO DE VALORES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal dos produtos</span>
            <span>R$ {totalAmount.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Taxa de Entrega ({cartStore.name})</span>
            <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-100">
            <span>Total</span>
            <span className="text-[#1754AE]">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
          </div>

          <div className="pt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2 text-[11px]">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Fase Atual (v0.2):</strong> A estrutura de pedidos e carrinho por loja está
              implementada. Conforme o roadmap, a finalização completa de pedidos e pagamentos
              entrará nas versões <strong>v0.3 e v0.4</strong>.
            </span>
          </div>

          <Link to="/roadmap" className="block w-full">
            <Button className="w-full bg-[#1754AE] hover:bg-[#12428C] text-white text-xs font-bold py-2.5">
              Consultar Próximas Fases no Roadmap
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CartPage
