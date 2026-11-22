import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'

export interface ComplementItem {
  key: string
  name: string
  price: number
}

export interface ComplementGroupItem {
  key: string
  name: string
  required: boolean
  min: number
  max: number
  items: ComplementItem[]
}

interface Props {
  complements: unknown[]
  onChange: (arr: unknown[]) => void
}

const parse = (v: unknown[]): ComplementGroupItem[] =>
  (v as ComplementGroupItem[]).map((g) => ({
    key: g?.key || crypto.randomUUID(),
    name: g?.name || '',
    required: !!g?.required,
    min: g?.min ?? 0,
    max: g?.max ?? 0,
    items: (g?.items || []).map((it: ComplementItem) => ({
      key: it?.key || crypto.randomUUID(),
      name: it?.name || '',
      price: Number(it?.price) || 0,
    })),
  }))

/** Editor de complementos: grupos opcionais/obrigatórios com min/max e itens com preço. */
export const ComplementsEditor: React.FC<Props> = ({ complements, onChange }) => {
  const [groups, setGroups] = useState<ComplementGroupItem[]>(parse(complements))

  const update = (next: ComplementGroupItem[]) => {
    setGroups(next)
    onChange(next)
  }

  const patchGroup = (key: string, patch: Partial<ComplementGroupItem>) =>
    update(groups.map((g) => (g.key === key ? { ...g, ...patch } : g)))

  const addGroup = () =>
    update([
      ...groups,
      { key: crypto.randomUUID(), name: '', required: false, min: 0, max: 0, items: [] },
    ])

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Complementos são adicionais que o cliente escolhe (ex: borda recheada, bacon extra). Grupos
        obrigatórios forçam a escolha antes de adicionar ao carrinho.
      </p>
      {groups.map((g) => (
        <div
          key={g.key}
          className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50/50"
        >
          <div className="flex justify-between items-center gap-2">
            <Input
              value={g.name}
              onChange={(e) => patchGroup(g.key, { name: e.target.value })}
              className="text-xs font-semibold flex-1"
              placeholder="Nome do grupo (ex: Adicionais)"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update(groups.filter((x) => x.key !== g.key))}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 col-span-3">
              <input
                type="checkbox"
                id={`req-${g.key}`}
                checked={g.required}
                onChange={(e) => patchGroup(g.key, { required: e.target.checked })}
                className="rounded"
              />
              <label htmlFor={`req-${g.key}`} className="text-[11px] text-slate-700">
                Grupo obrigatório
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Mínimo</Label>
              <Input
                type="number"
                min="0"
                value={g.min ?? ''}
                onChange={(e) => patchGroup(g.key, { min: parseInt(e.target.value, 10) || 0 })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">Máximo (0 = sem limite)</Label>
              <Input
                type="number"
                min="0"
                value={g.max || ''}
                onChange={(e) => patchGroup(g.key, { max: parseInt(e.target.value, 10) || 0 })}
                className="text-xs"
              />
            </div>
          </div>

          {/* Itens do grupo */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-[11px] font-semibold text-slate-700">Itens</Label>
            {g.items.map((item) => (
              <div key={item.key} className="flex gap-1.5 items-center">
                <Input
                  value={item.name}
                  onChange={(e) =>
                    patchGroup(g.key, {
                      items: g.items.map((x) =>
                        x.key === item.key ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                  className="text-xs flex-1"
                  placeholder="Nome do item"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={item.price || ''}
                  onChange={(e) =>
                    patchGroup(g.key, {
                      items: g.items.map((x) =>
                        x.key === item.key ? { ...x, price: parseFloat(e.target.value) || 0 } : x,
                      ),
                    })
                  }
                  className="text-xs w-24"
                  placeholder="R$"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    patchGroup(g.key, { items: g.items.filter((x) => x.key !== item.key) })
                  }
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[11px] text-[#1754AE]"
              onClick={() =>
                patchGroup(g.key, {
                  items: [...g.items, { key: crypto.randomUUID(), name: '', price: 0 }],
                })
              }
            >
              <Plus className="w-3 h-3 mr-1" /> Adicionar item
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addGroup}
        className="text-xs border-[#1754AE] text-[#1754AE]"
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar grupo de complementos
      </Button>
    </div>
  )
}
