/**
 * CSV v0.2 — Exportação e importação de catálogo + estoque (Borali).
 * Export: gera CSV com colunas canônicas e modelo para download.
 * Import: faz parse e validação, marcando duplicidades e conflitos.
 * NUNCA sobrescreve produto existente sem confirmação explícita do usuário.
 */
import type { Product } from '@/types'

export const CSV_COLUMNS = [
  'nome',
  'descricao',
  'marca',
  'categoria_interna',
  'subcategoria',
  'codigo_interno',
  'codigo_barras',
  'unidade',
  'preco',
  'preco_promo',
  'promo_inicio',
  'promo_fim',
  'estoque',
  'estoque_minimo',
  'controlar_estoque',
  'disponivel',
  'status',
  'lote',
  'id',
] as const

const ESCAPE = /[";\n]/g
function cell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return ESCAPE.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function productsToCSV(products: Product[], categoryName: (p: Product) => string): string {
  const header = CSV_COLUMNS.join(';')
  const lines = products.map((p) =>
    [
      p.name,
      p.description,
      p.brand,
      categoryName(p),
      p.subcategory,
      p.internal_code,
      p.barcode,
      p.unit,
      p.price,
      p.promo_price ?? '',
      p.promo_starts_at ?? '',
      p.promo_ends_at ?? '',
      p.stock ?? 0,
      p.min_stock ?? 0,
      p.track_stock === false ? 'nao' : 'sim',
      p.is_available ? 'sim' : 'nao',
      p.status,
      p.lot,
      p.id,
    ]
      .map(cell)
      .join(';'),
  )
  return [header, ...lines].join('\n')
}

export const CSV_TEMPLATE = CSV_COLUMNS.join(';')

/** Parse simples de CSV com ; e aspas, tolerante a BOM e quebras \r\n */
export function parseCSV(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
      continue
    }
    if (ch === '"') inQuotes = true
    else if (ch === ';') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

export type CSVRow = Record<string, string>

export function csvToRows(text: string): CSVRow[] {
  const parsed = parseCSV(text)
  if (parsed.length < 2) return []
  const header = parsed[0].map((h) => h.trim().toLowerCase())
  return parsed.slice(1).map((cells) => {
    const row: CSVRow = {}
    header.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim()
    })
    return row
  })
}

export type CSVRowIssue = {
  row: CSVRow
  rowNumber: number
  errors: string[]
  /** produto existente com mesmo código interno ou código de barras */
  conflict?: Product
}

export type CSVParseResult = {
  valid: CSVRow[]
  issues: CSVRowIssue[]
}

const parseBool = (v: string, fallback: boolean) =>
  v === '' ? fallback : ['sim', 'true', '1', 's', 'x'].includes(v.toLowerCase())

const parseDateToUnix = (v: string): number | undefined => {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isNaN(n) && /^\d+(\.\d+)?$/.test(v)) return Math.floor(n)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : Math.floor(d.getTime() / 1000)
}

/**
 * Valida linhas importadas: obrigatórios, unidade e promoção.
 * Detecta duplicidade por código interno/código de barras contra o catálogo atual.
 */
export function validateCSVRows(rows: CSVRow[], existing: Product[]): CSVParseResult {
  const valid: CSVRow[] = []
  const issues: CSVRowIssue[] = []
  const seenCodes = new Set<string>()
  const seenBarcodes = new Set<string>()

  rows.forEach((row, idx) => {
    const errors: string[] = []
    const name = row['nome'] ?? ''
    const price = Number((row['preco'] ?? '').replace(',', '.'))
    const unit = (row['unidade'] ?? '').toLowerCase()

    if (!name) errors.push('nome é obrigatório')
    if (!row['preco'] || Number.isNaN(price) || price <= 0) errors.push('preço deve ser > 0')
    if (!unit) errors.push('unidade é obrigatória')

    const promo = Number((row['preco_promo'] ?? '').replace(',', '.'))
    if (row['preco_promo'] && (Number.isNaN(promo) || promo <= 0))
      errors.push('preço promocional inválido')
    if (!Number.isNaN(promo) && promo > 0 && !Number.isNaN(price) && promo >= price)
      errors.push('preço promocional deve ser menor que o preço normal')

    const internalCode = row['codigo_interno'] ?? ''
    const barcode = row['codigo_barras'] ?? ''
    if (internalCode && seenCodes.has(internalCode))
      errors.push(`código interno "${internalCode}" repetido no arquivo`)
    if (barcode && seenBarcodes.has(barcode))
      errors.push(`código de barras "${barcode}" repetido no arquivo`)
    seenCodes.add(internalCode)
    seenBarcodes.add(barcode)

    // Conflito com produto existente (nunca sobrescrever silenciosamente)
    let conflict: Product | undefined
    if (internalCode || barcode) {
      conflict = existing.find(
        (p) =>
          (internalCode && p.internal_code === internalCode) || (barcode && p.barcode === barcode),
      )
      if (conflict)
        errors.push(
          `conflito: já existe "${conflict.name}" com esse código (atualiza só com sua confirmação)`,
        )
    }

    const issue: CSVRowIssue = { row, rowNumber: idx + 2, errors, conflict }
    if (errors.length > 0) issues.push(issue)
    else valid.push(row)
  })

  return { valid, issues }
}

/** Converte linhas validadas em payloads de produto (criação ou atualização) */
export function rowsToPayloads(
  rows: CSVRow[],
  categoryIdByName: Map<string, string>,
  conflictIds: Set<string>,
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const catName = (row['categoria_interna'] ?? '').trim()
    const promoPrice = Number((row['preco_promo'] ?? '').replace(',', '.'))
    const payload: Record<string, unknown> = {
      name: row['nome'],
      description: row['descricao'] ?? '',
      brand: row['marca'] ?? '',
      subcategory: row['subcategoria'] ?? '',
      internal_code: row['codigo_interno'] ?? '',
      barcode: row['codigo_barras'] ?? '',
      unit: (row['unidade'] ?? 'un').toLowerCase(),
      price: Number((row['preco'] ?? '0').replace(',', '.')),
      stock: row['estoque'] ? Number(row['estoque']) : 0,
      min_stock: row['estoque_minimo'] ? Number(row['estoque_minimo']) : 0,
      track_stock: parseBool(row['controlar_estoque'] ?? '', true),
      is_available: parseBool(row['disponivel'] ?? '', true),
      status: (row['status'] ?? 'active').toLowerCase(),
      lot: row['lote'] ?? '',
    }
    if (catName && categoryIdByName.has(catName))
      payload.store_category_id = categoryIdByName.get(catName)
    if (promoPrice > 0) {
      payload.promo_price = promoPrice
      const s = parseDateToUnix(row['promo_inicio'] ?? '')
      const e = parseDateToUnix(row['promo_fim'] ?? '')
      if (s !== undefined) payload.promo_starts_at = s
      if (e !== undefined) payload.promo_ends_at = e
    }
    const existingId = row['id'] ?? ''
    if (existingId && conflictIds.has(existingId)) payload.id = existingId
    return payload
  })
}
