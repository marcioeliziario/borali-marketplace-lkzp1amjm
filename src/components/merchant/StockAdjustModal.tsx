import React, { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { getStockMovements, adjustStock } from '@/services/api'
import type { Product, StockMovement } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Package } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  storeId: string
  onAdjusted: (updated: { id: string; name: string; stock: number; unit: string }) => void
}

const REASONS = ['Compra recebida', 'Correção de inventário', 'Avaria/loss', 'Vencimento', 'Outro']

/** Ajuste manual de estoque com registro em stock_movements + histórico visível. */
export const StockAdjustModal: React.FC<Props> = ({ open, onOpenChange, product, onAdjusted }) => {
  const { toast } = useToast()
  const [delta, setDelta] = useState(0)
  const [reason, setReason] = useState(REASONS[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (!open || !product) return
    setDelta(0)
    setReason(REASONS[0])
    setNotes('')
    setLoadingHistory(true)
    getStockMovements({ productId: product.id, perPage: 20 })
      .then(setMovements)
      .catch(() => setMovements([]))
      .finally(() => setLoadingHistory(false))
  }, [open, product])

  const currentStock = product?.stock ?? 0
  const projected = currentStock + delta
  const lowStock = useMemo(
    () =>
      product &&
      product.track_stock !== false &&
      (product.min_stock ?? 0) > 0 &&
      currentStock <= (product.min_stock ?? 0),
    [product, currentStock],
  )

  const handleAdjust = async () => {
    if (!product) return
    if (delta === 0) {
      toast({ variant: 'destructive', title: 'Informe uma quantidade diferente de zero' })
      return
    }
    if (projected < 0) {
      toast({
        variant: 'destructive',
        title: 'Estoque não pode ficar negativo',
        description: `Saída máxima permitida: ${currentStock} ${product.unit}.`,
      })
      return
    }
    setSaving(true)
    try {
      const fullReason = notes.trim() ? `${reason}: ${notes.trim()}` : reason
      const updated = await adjustStock(product.id, delta, fullReason)
      onAdjusted(updated)
      toast({
        title: 'Estoque atualizado',
        description: `${updated.name}: ${currentStock} → ${updated.stock}`,
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao ajustar estoque',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#1754AE]" /> Estoque — {product.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Cada ajuste fica registrado no histórico com motivo e data.
          </DialogDescription>
        </DialogHeader>

        {lowStock && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
            ⚠️ Estoque atual ({currentStock}) está no mínimo ({product.min_stock}). Reprograme a
            compra.
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-slate-600">Estoque atual</span>
            <span className="font-bold text-slate-900">
              {currentStock} {product.unit}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Quantidade</Label>
              <Input
                type="number"
                value={delta === 0 ? '' : delta}
                onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
                placeholder="+10 ou -3"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ficará com</Label>
              <div
                className={`h-9 flex items-center px-3 rounded-md border text-xs font-semibold ${projected < 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
              >
                {projected} {product.unit}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Motivo</Label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 text-xs px-2 bg-white"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Observação (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
              placeholder="ex: NF 1234 — fornecedor X"
            />
          </div>
          <Button
            onClick={handleAdjust}
            disabled={saving || delta === 0 || projected < 0}
            className="w-full bg-[#1754AE] hover:bg-[#12428C] text-white"
            size="sm"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
            Confirmar ajuste
          </Button>
        </div>

        <div className="border-t pt-3">
          <Label className="text-xs font-semibold">Histórico recente</Label>
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {loadingHistory && (
              <div className="flex justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            )}
            {!loadingHistory && movements.length === 0 && (
              <p className="text-[11px] text-slate-400 text-center py-2">
                Nenhuma movimentação registrada ainda.
              </p>
            )}
            {movements.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between text-[11px] bg-slate-50 rounded px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">{m.reason}</p>
                  <p className="text-slate-400">
                    {m.created ? new Date(m.created).toLocaleString('pt-BR') : ''}
                    {m.user_email ? ` · ${m.user_email}` : ''}
                  </p>
                </div>
                <span
                  className={`font-bold ml-2 ${m.delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {m.delta > 0 ? '+' : ''}
                  {m.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
