import React, { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { createProductCategory, updateProductCategory, deleteProductCategory } from '@/services/api'
import type { StoreCategory } from '@/types'
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
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  categories: StoreCategory[]
  onChange: (next: StoreCategory[]) => void
}

/** CRUD das categorias internas da loja (coleção store_categories). */
export const CategoryManagerModal: React.FC<Props> = ({
  open,
  onOpenChange,
  storeId,
  categories,
  onChange,
}) => {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      const created = await createProductCategory({
        store_id: storeId,
        name: name.trim(),
        display_order: categories.length + 1,
        is_active: true,
      })
      onChange([...categories, created])
      setName('')
      toast({ title: 'Categoria criada' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar categoria',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  const handleUpdate = async (id: string, patch: Partial<StoreCategory>) => {
    try {
      const updated = await updateProductCategory(id, patch)
      onChange(categories.map((c) => (c.id === id ? updated : c)))
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const handleDelete = async (id: string) => {
    setBusy(true)
    try {
      await deleteProductCategory(id)
      onChange(categories.filter((c) => c.id !== id))
      toast({ title: 'Categoria removida' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Categorias internas
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Organizam seu catálogo dentro da sua loja (ex: Bebidas, Limpeza).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {categories.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Nenhuma categoria ainda.</p>
          )}
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
            >
              {editingId === c.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-xs flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="bg-[#1754AE] text-white"
                    onClick={async () => {
                      await handleUpdate(c.id, { name: editName })
                      setEditingId(null)
                    }}
                  >
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xs flex-1 truncate">{c.name}</span>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(v) => handleUpdate(c.id, { is_active: v })}
                  />
                  <button
                    onClick={() => {
                      setEditingId(c.id)
                      setEditName(c.name)
                    }}
                    aria-label="Renomear"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} aria-label="Remover" disabled={busy}>
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="border-t pt-3 flex-col gap-2 sm:flex-col sm:items-stretch">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nova categoria (ex: Bebidas)"
              className="text-xs flex-1"
            />
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={busy || !name.trim()}
              className="bg-[#1754AE] hover:bg-[#12428C] text-white whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Criar
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
