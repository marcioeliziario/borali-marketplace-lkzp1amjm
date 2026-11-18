import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2 } from 'lucide-react'

export interface VariationItem {
  key: string
  name: string
  price: number
  code: string
  photo: string
  stock: number
  is_available: boolean
}

interface Props {
  variations: unknown[]
  onChange: (arr: unknown[]) => void
}

const parse = (v: unknown[]): VariationItem[] =>
  (v as VariationItem[]).map((it) => ({
    key: it?.key || crypto.randomUUID(),
    name: it?.name || '',
    price: Number(it?.price) || 0,
    code: it?.code || '',
    photo: it?.photo || '',
    stock: it?.stock ?? 0,
    is_available: it?.is_available !== false,
  }))

/** Editor de variações: nome, preço, código, foto (URL) e estoque independentes. */
export const VariationsEditor: React.FC<Props> = ({ variations, onChange }) => {
  const [items, setItems] = useState<VariationItem[]>(parse(variations))

  const update = (next: VariationItem[]) => {
    setItems(next)
    onChange(next)
  }

  const setField = (key: string, field: keyof VariationItem, value: string | number | boolean) => {
    update(items.map((it) => (it.key === key ? { ...it, [field]: value } : it)))
  }

  const add = () =>
    update([
      ...items,
      {
        key: crypto.randomUUID(),
        name: '',
        price: 0,
        code: '',
        photo: '',
        stock: 0,
        is_available: true,
      },
    ])

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Variações são versões do produto com preço/estoque próprios (ex: tamanho P/M/G).
      </p>
      {items.map((it) => (
        <div
          key={it.key}
          className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50/50"
        >
          <div className="flex justify-between items-center">
            <Label className="text-xs font-semibold">Variação</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update(items.filter((x) => x.key !== it.key))}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Nome (ex: Grande)</Label>
              <Input
                value={it.name}
                onChange={(e) => setField(it.key, 'name', e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Preço adicional (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={it.price || ''}
                onChange={(e) => setField(it.key, 'price', parseFloat(e.target.value) || 0)}
                className="text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Código</Label>
              <Input
                value={it.code}
                onChange={(e) => setField(it.key, 'code', e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Estoque</Label>
              <Input
                type="number"
                value={it.stock ?? ''}
                onChange={(e) => setField(it.key, 'stock', parseInt(e.target.value, 10) || 0)}
                className="text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Foto (URL)</Label>
              <Input
                value={it.photo}
                onChange={(e) => setField(it.key, 'photo', e.target.value)}
                className="text-xs"
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between pb-1.5">
              <Label className="text-[11px] text-slate-600">Disponível</Label>
              <Switch
                checked={it.is_available}
                onCheckedChange={(c) => setField(it.key, 'is_available', c)}
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="text-xs border-[#1754AE] text-[#1754AE]"
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar variação
      </Button>
    </div>
  )
}
