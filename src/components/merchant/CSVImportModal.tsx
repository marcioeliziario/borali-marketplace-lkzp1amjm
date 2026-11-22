import React, { useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { createProduct, updateProduct } from '@/services/api'
import type { Product, StoreCategory } from '@/types'
import {
  CSV_TEMPLATE,
  csvToRows,
  validateCSVRows,
  rowsToPayloads,
  type CSVRowIssue,
} from '@/lib/csv'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { FileDown, FileUp, Loader2, TriangleAlert } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  existing: Product[]
  categories: StoreCategory[]
  onImported: () => void
}

const download = (content: string, filename: string, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob(['\uFEFF' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Importação CSV com modelo, pré-visualização, validação e confirmação de conflitos. */
export const CSVImportModal: React.FC<Props> = ({
  open,
  onOpenChange,
  storeId,
  existing,
  categories,
  onImported,
}) => {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [validRows, setValidRows] = useState<Parameters<typeof rowsToPayloads>[0]>([])
  const [issues, setIssues] = useState<CSVRowIssue[]>([])
  const [conflictIds, setConflictIds] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState<{ created: number; updated: number } | null>(null)

  const reset = () => {
    setValidRows([])
    setIssues([])
    setConflictIds(new Set())
    setDone(null)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    reset()
    setParsing(true)
    try {
      const text = await file.text()
      const rows = csvToRows(text)
      if (rows.length === 0) {
        toast({ variant: 'destructive', title: 'Arquivo vazio ou sem colunas reconhecidas' })
        return
      }
      const { valid, issues: found } = validateCSVRows(rows, existing)
      setValidRows(valid)
      setIssues(found)
      setConflictIds(
        new Set(found.filter((i) => i.conflict).map((i) => i.row['id'] ?? i.conflict!.id)),
      )
    } finally {
      setParsing(false)
    }
  }

  const toggleConflict = (id: string, checked: boolean) => {
    setConflictIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleImport = async () => {
    if (validRows.length === 0) return
    setImporting(true)
    try {
      const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))
      const payloads = rowsToPayloads(validRows, catMap, conflictIds)
      let created = 0
      let updated = 0
      for (const payload of payloads) {
        if (payload.id) {
          const { id, ...rest } = payload
          await updateProduct(String(id), rest)
          updated++
        } else {
          await createProduct({ store_id: storeId, ...payload })
          created++
        }
      }
      setDone({ created, updated })
      onImported()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!importing) {
          onOpenChange(o)
          if (!o) reset()
        }
      }}
    >
      <DialogContent className="max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Importar produtos (CSV)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Use o modelo para baixar as colunas certas. Pré-visualize antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs w-full"
            onClick={() => download(CSV_TEMPLATE, 'borali-modelo-importacao.csv')}
          >
            <FileDown className="w-3.5 h-3.5 mr-1" /> Baixar modelo CSV
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            size="sm"
            className="w-full bg-[#1754AE] hover:bg-[#12428C] text-white"
            onClick={() => fileRef.current?.click()}
            disabled={parsing || importing}
          >
            {parsing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <FileUp className="w-3.5 h-3.5 mr-1" />
            )}
            Selecionar arquivo CSV
          </Button>

          {done && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <AlertTitle className="text-xs text-emerald-800">Importação concluída</AlertTitle>
              <AlertDescription className="text-[11px] text-emerald-700">
                {done.created} produto(s) criado(s), {done.updated} atualizado(s) sob sua
                confirmação.
              </AlertDescription>
            </Alert>
          )}

          {issues.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                <TriangleAlert className="w-3.5 h-3.5" /> {issues.length} linha(s) com problema:
              </p>
              {issues.map((iss) => (
                <div
                  key={iss.rowNumber}
                  className="rounded-lg border border-red-200 bg-red-50 p-2 space-y-1"
                >
                  <p className="text-[11px] font-semibold text-red-800">
                    Linha {iss.rowNumber} — {iss.row['nome'] || '(sem nome)'}
                  </p>
                  {iss.errors.map((er, i) => (
                    <p key={i} className="text-[11px] text-red-700">
                      • {er}
                    </p>
                  ))}
                  {iss.conflict && (
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-700">
                      <Checkbox
                        checked={conflictIds.has(iss.conflict.id)}
                        onCheckedChange={(c) => toggleConflict(iss.conflict!.id, c === true)}
                      />
                      Atualizar o produto existente "{iss.conflict.name}" (ID {iss.conflict.id})
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}

          {validRows.length > 0 && (
            <div className="rounded-lg border border-slate-200 p-2">
              <p className="text-xs font-semibold text-slate-700 mb-1">
                Pré-visualização — {validRows.length} linha(s) pronta(s):
              </p>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {validRows.slice(0, 30).map((r, i) => (
                  <p key={i} className="text-[11px] text-slate-600 truncate">
                    {i + 1}. {r['nome']} — R$ {r['preco']} ({r['unidade']})
                  </p>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                Confirmar importação de {validRows.length} produto(s)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
