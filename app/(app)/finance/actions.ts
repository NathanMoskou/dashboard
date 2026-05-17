"use server"
import { revalidatePath } from "next/cache"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/server"

function parseAmount(raw: string): number | null {
  if (!raw) return null
  const m = String(raw).trim().match(/-?\d+(?:[.,]\d+)*/)
  if (!m) return null
  const s = m[0]
  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."))
  if (lastSep < 0) {
    const n = parseFloat(s)
    return Number.isNaN(n) ? null : n
  }
  const after = s.slice(lastSep + 1)
  // 3-digit group after last separator AND it's not the only separator group → thousands
  const onlySepGroup = s.indexOf(",") === lastSep && s.indexOf(".") === -1 ||
                       s.indexOf(".") === lastSep && s.indexOf(",") === -1
  const hasMultiSeparators = (s.match(/[.,]/g)?.length ?? 0) > 1
  if (after.length === 3 && /^\d{3}$/.test(after) && (hasMultiSeparators || !onlySepGroup)) {
    const n = parseFloat(s.replace(/[.,]/g, ""))
    return Number.isNaN(n) ? null : n
  }
  const cleaned = s.slice(0, lastSep).replace(/[.,]/g, "") + "." + after
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? null : n
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  // Accept yyyy-mm-dd, yyyy/mm/dd, dd-mm-yyyy, dd/mm/yyyy
  const iso = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const eu = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/)
  if (eu) return `${eu[3]}-${eu[2]}-${eu[1]}`
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
  return null
}

const FIELDS = {
  date: ["date", "datum", "transaction_date", "transaction date", "boekdatum"],
  description: [
    "tegenpartij naam", // Dyme: counterparty name (most readable)
    "description",
    "omschrijving",
    "memo",
    "details",
    "tegenrekening",
    "name",
  ],
  amount: ["amount", "bedrag", "amount_eur", "value"],
  category: ["category", "categorie"],
  subcategory: ["subcategory", "subcategorie", "super-categorie", "supercategorie"],
  type: ["type", "in/uit", "income/expense"],
} as const

function pick(row: Record<string, string>, keys: readonly string[]): string {
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]))
  for (const k of keys) {
    if (lower[k] != null && lower[k] !== "") return lower[k] as string
  }
  return ""
}

function pickTxSheet(sheetNames: string[]): string {
  // Prefer a sheet whose name looks like transactions; fall back to one that
  // actually has Datum + Bedrag header columns; finally fall back to first sheet.
  return (
    sheetNames.find((n) => /^transac(t|c)ie/i.test(n)) ??
    sheetNames.find((n) => /transact/i.test(n)) ??
    sheetNames[0]
  )
}

async function readRows(file: File): Promise<Record<string, string>[]> {
  const lower = file.name.toLowerCase()
  const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".xlsm")
  if (isExcel) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array", cellDates: false })
    if (!wb.SheetNames.length) return []
    const sheetName = pickTxSheet(wb.SheetNames)
    const sheet = wb.Sheets[sheetName]
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: "",
      raw: false,
    })
  }
  const text = await file.text()
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: "",
  })
  return parsed.data ?? []
}

export async function importCsv(formData: FormData) {
  const file = formData.get("csv") as File | null
  // "replace" = wipe ALL existing transactions before insert (full reset).
  // Default is true since exports from Dyme include the full history each
  // time and the user explicitly asked for replace-not-append semantics.
  const replace = formData.get("replace") !== "false"
  if (!file) return { ok: false, error: "Geen bestand gekozen" }
  let rows: Record<string, string>[]
  try {
    rows = await readRows(file)
  } catch (e) {
    return { ok: false, error: `Kon bestand niet lezen: ${String(e).slice(0, 120)}` }
  }
  if (!rows.length) return { ok: false, error: "Geen rijen gevonden" }

  const supabase = await createClient()

  const periodDates: string[] = []
  const insertRows = [] as {
    date: string
    description: string
    amount_eur: number
    type: "income" | "expense"
    category: string | null
    subcategory: string | null
  }[]

  for (const r of rows) {
    const date = parseDate(pick(r, FIELDS.date))
    const amt = parseAmount(pick(r, FIELDS.amount))
    if (!date || amt == null) continue
    const description = pick(r, FIELDS.description)
    const typeRaw = pick(r, FIELDS.type).toLowerCase()
    const type: "income" | "expense" =
      typeRaw === "income" || typeRaw === "in" || amt > 0 ? "income" : "expense"
    insertRows.push({
      date,
      description,
      amount_eur: Math.abs(amt),
      type,
      category: pick(r, FIELDS.category) || null,
      subcategory: pick(r, FIELDS.subcategory) || null,
    })
    periodDates.push(date)
  }
  if (!insertRows.length) return { ok: false, error: "Geen geldige rijen" }

  periodDates.sort()
  const start = periodDates[0]
  const end = periodDates[periodDates.length - 1]

  // Replace mode: clear ALL existing transactions for this user before insert.
  // RLS scopes the delete to the current user.
  let wiped = 0
  if (replace) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Niet ingelogd" }
    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
    wiped = count ?? 0
    await supabase.from("transactions").delete().eq("user_id", user.id)
  }

  const { data: batch } = await supabase
    .from("csv_imports")
    .insert({
      filename: file.name,
      row_count: insertRows.length,
      period_start: start,
      period_end: end,
    })
    .select("id")
    .single()

  let inserted = 0
  let skipped = 0

  if (replace) {
    // Clean slate — insert everything (no dedup needed)
    await supabase.from("transactions").insert(
      insertRows.map((r) => ({ ...r, import_batch_id: batch?.id ?? null })),
    )
    inserted = insertRows.length
  } else {
    // Append mode — dedup against existing transactions in this period
    const { data: existing } = await supabase
      .from("transactions")
      .select("date, amount_eur, description")
      .gte("date", start)
      .lte("date", end)
    const seen = new Set(
      (existing ?? []).map((e) => `${e.date}|${Number(e.amount_eur).toFixed(2)}|${e.description}`),
    )
    const fresh = insertRows.filter(
      (r) => !seen.has(`${r.date}|${r.amount_eur.toFixed(2)}|${r.description ?? ""}`),
    )
    if (fresh.length) {
      await supabase.from("transactions").insert(
        fresh.map((r) => ({ ...r, import_batch_id: batch?.id ?? null })),
      )
    }
    inserted = fresh.length
    skipped = insertRows.length - fresh.length
  }

  revalidatePath("/finance")
  revalidatePath("/finance/transactions")
  return { ok: true, inserted, skipped, wiped, mode: replace ? "replace" : "append" }
}

/** Update a single transaction. Used by the edit-row UI on /finance/transactions. */
export async function updateTransaction(id: string, fields: {
  date?: string
  description?: string
  amount_eur?: number
  type?: "income" | "expense"
  category?: string | null
  subcategory?: string | null
}) {
  const supabase = await createClient()
  await supabase.from("transactions").update(fields).eq("id", id)
  revalidatePath("/finance")
  revalidatePath("/finance/transactions")
}

/** Hard-delete a transaction. */
export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  await supabase.from("transactions").delete().eq("id", id)
  revalidatePath("/finance")
  revalidatePath("/finance/transactions")
}

/** Nuke ALL transactions for the current user. For the "Reset finance" button. */
export async function deleteAllTransactions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Niet ingelogd" }
  const { error } = await supabase.from("transactions").delete().eq("user_id", user.id)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/finance")
  revalidatePath("/finance/transactions")
  return { ok: true as const }
}

export async function setCategory(id: string, category: string) {
  const supabase = await createClient()
  await supabase.from("transactions").update({ category }).eq("id", id)
  revalidatePath("/finance")
}

export async function addBucketItem(formData: FormData) {
  const supabase = await createClient()
  await supabase.from("bucket_list_items").insert({
    title: String(formData.get("title") ?? ""),
    estimated_cost_eur: Number(formData.get("estimated_cost_eur") ?? 0) || null,
    target_date: (formData.get("target_date") as string) || null,
    priority: Number(formData.get("priority") ?? 2),
  })
  revalidatePath("/finance/bucket")
}

export async function toggleBucket(id: string, isCompleted: boolean) {
  const supabase = await createClient()
  await supabase
    .from("bucket_list_items")
    .update({
      is_completed: !isCompleted,
      completed_date: !isCompleted ? new Date().toISOString().split("T")[0] : null,
    })
    .eq("id", id)
  revalidatePath("/finance/bucket")
}
