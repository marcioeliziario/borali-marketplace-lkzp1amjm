import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Star, Trash2, Upload } from 'lucide-react'
import type { Product } from '@/types'
import pb from '@/lib/pocketbase/client'

interface Props {
  editing: Product | null
  existingPhotos: string[]
  setExistingPhotos: React.Dispatch<React.SetStateAction<string[]>>
  mainPhoto: string
  setMainPhoto: React.Dispatch<React.SetStateAction<string>>
  newPhotos: File[]
  setNewPhotos: React.Dispatch<React.SetStateAction<File[]>>
  uploading: boolean
  onUpload: () => Promise<void>
}

const MAX_MB = 5
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/** Editor de fotos: upload múltiplo, foto principal, reordenar e remover. */
export const PhotosEditor: React.FC<Props> = ({
  editing,
  existingPhotos,
  setExistingPhotos,
  mainPhoto,
  setMainPhoto,
  newPhotos,
  setNewPhotos,
  uploading,
  onUpload,
}) => {
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')

  const validate = (files: File[]): boolean => {
    for (const f of files) {
      if (!ACCEPTED.includes(f.type)) {
        setError(`"${f.name}": formato não aceito (use JPG, PNG ou WebP).`)
        return false
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`"${f.name}": passa de ${MAX_MB} MB.`)
        return false
      }
    }
    setError('')
    return true
  }

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!validate(files)) return
    setNewPhotos((prev) => [...prev, ...files])
    e.target.value = ''
  }

  const removeExisting = async (filename: string) => {
    if (!editing) return
    setRemoving(filename)
    try {
      const remaining = existingPhotos.filter((f) => f !== filename)
      const formData = new FormData()
      formData.append('photos-', filename) // PocketBase: "field-" remove arquivo
      formData.append('main_photo', mainPhoto === filename ? '' : mainPhoto)
      await pb.collection('products').update(editing.id, formData)
      setExistingPhotos(remaining)
      if (mainPhoto === filename) setMainPhoto(remaining[0] || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover foto.')
    } finally {
      setRemoving(null)
    }
  }

  const move = (filename: string, dir: -1 | 1) => {
    setExistingPhotos((prev) => {
      const idx = prev.indexOf(filename)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[target]] = [copy[target], copy[idx]]
      return copy
    })
  }

  const photoUrl = (filename: string) =>
    `${pb.baseUrl}/api/files/products/${editing?.id}/${filename}`

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </p>
      )}

      {/* Fotos já salvas no banco */}
      {existingPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {existingPhotos.map((filename) => (
            <div
              key={filename}
              className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
            >
              <img
                src={photoUrl(filename)}
                alt="Foto do produto"
                className="w-full aspect-square object-cover"
              />
              {mainPhoto === filename ? (
                <span className="absolute top-1 left-1 bg-[#1754AE] text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-current" /> Principal
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setMainPhoto(filename)}
                  className="absolute top-1 left-1 bg-white/90 text-slate-600 text-[9px] px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition"
                >
                  <Star className="w-2.5 h-2.5" />
                </button>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white flex justify-between items-center px-1 py-0.5 opacity-0 group-hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={() => move(filename, -1)}
                  className="text-[10px] px-1"
                  aria-label="Mover para frente"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(filename, 1)}
                  className="text-[10px] px-1"
                  aria-label="Mover para trás"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => removeExisting(filename)}
                  className="text-[10px]"
                  aria-label="Remover"
                >
                  {removing === filename ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload de novas fotos */}
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center">
        <input
          id="photo-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleSelect}
        />
        <label
          htmlFor="photo-input"
          className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-[#1754AE]"
        >
          <Upload className="w-3.5 h-3.5" /> Selecionar fotos (JPG, PNG, WebP — máx. {MAX_MB} MB
          cada)
        </label>
        {newPhotos.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] text-slate-600">
              {newPhotos.length} foto(s) pronta(s) para envio:
            </p>
            {newPhotos.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 rounded px-2 py-1"
              >
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setNewPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              onClick={onUpload}
              disabled={uploading}
              className="bg-[#1754AE] hover:bg-[#12428C] text-white w-full"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 mr-1" />
              )}
              Enviar fotos ao servidor
            </Button>
          </div>
        )}
        {!editing && newPhotos.length > 0 && (
          <p className="text-[10px] text-amber-700 mt-1">
            As fotos são anexadas quando você salva o produto.
          </p>
        )}
      </div>
    </div>
  )
}
