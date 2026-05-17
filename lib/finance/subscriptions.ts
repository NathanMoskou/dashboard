/**
 * Subscription radar.
 *
 * Heuristic detection of recurring monthly expenses from the transactions
 * table. We don't try to be clever about it — recurring real-world subs
 * have very predictable shape:
 *
 *   - same (or very similar) description text
 *   - same (or nearly-same) amount
 *   - charged once every 27–34 days
 *
 * So we normalize the description to a stable key, bucket by amount, and
 * promote any bucket with ≥ 2 hits in the lookback window whose median
 * inter-charge gap is in the monthly range.
 *
 * The output is intentionally cheap to compute server-side on every
 * /finance render — no caching needed.
 */

export type RawTx = {
  date: string
  description: string | null
  amount_eur: number
  type: string | null
}

export type Subscription = {
  /** Stable hash used for dismissal — `${normalizedName}:${amount.toFixed(2)}` */
  patternKey: string
  /** Cleaned, display-ready name */
  name: string
  /** Most common amount in the cluster */
  amountEur: number
  /** Number of occurrences within the lookback window */
  hits: number
  /** Median days between charges (rounded) */
  cadenceDays: number
  /** ISO date of most recent hit */
  lastSeen: string
  /** ISO date of expected next hit (lastSeen + cadenceDays) */
  nextDue: string
}

/** Strip dates, transaction codes, and reference numbers from descriptions. */
function normalizeDescription(d: string | null): string {
  if (!d) return ""
  return d
    .toLowerCase()
    // strip dates like 12-05-2026 or 2026-05-12
    .replace(/\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b/g, "")
    // strip standalone numbers / reference codes ≥ 4 digits
    .replace(/\b\d{4,}\b/g, "")
    // strip card / iban / "transactie" noise
    .replace(/\b(transactie|pasbetaling|incasso|overboeking|sepa|ref|trxid|ideal)\b/gi, "")
    // collapse non-alphanum runs
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Round an amount to the nearest cent so floating-point noise doesn't fracture clusters. */
function quantize(n: number): number {
  return Math.round(n * 100) / 100
}

function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime()
  const db = new Date(b + "T00:00:00Z").getTime()
  return Math.abs(Math.round((db - da) / 86_400_000))
}

/** Title-case a normalized name for display. */
function displayName(normalized: string): string {
  if (!normalized) return "—"
  return normalized
    .split(" ")
    .filter(Boolean)
    .slice(0, 4) // first few tokens are usually the merchant
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

/**
 * Detect monthly recurring expenses among the provided transactions.
 * The caller passes the dismissed pattern keys so they can be filtered out
 * before the radar surfaces them.
 */
export function detectSubscriptions(
  txs: RawTx[],
  dismissed: Set<string>,
): Subscription[] {
  // Cluster expenses by normalized description + quantized amount
  const clusters = new Map<string, RawTx[]>()
  for (const t of txs) {
    if (t.type !== "expense") continue
    const norm = normalizeDescription(t.description)
    if (!norm) continue
    const key = `${norm}:${quantize(Number(t.amount_eur)).toFixed(2)}`
    const bucket = clusters.get(key) ?? []
    bucket.push(t)
    clusters.set(key, bucket)
  }

  const out: Subscription[] = []
  for (const [key, bucket] of clusters) {
    if (dismissed.has(key)) continue
    if (bucket.length < 2) continue

    // Sort by date ascending and compute inter-charge gaps
    const sorted = [...bucket].sort((a, b) => (a.date < b.date ? -1 : 1))
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date))
    }
    if (!gaps.length) continue

    const med = Math.round(median(gaps))
    // Allow a forgiving monthly window — banks can charge anywhere from
    // 27 to 34 days apart depending on weekends / business days.
    if (med < 25 || med > 35) continue

    const lastSeen = sorted[sorted.length - 1].date
    const nextDue = addDays(lastSeen, med)
    const amountEur = quantize(Number(sorted[0].amount_eur))
    const rawNorm = key.slice(0, key.lastIndexOf(":"))

    out.push({
      patternKey: key,
      name: displayName(rawNorm),
      amountEur,
      hits: sorted.length,
      cadenceDays: med,
      lastSeen,
      nextDue,
    })
  }

  // Highest monthly total first
  out.sort((a, b) => b.amountEur - a.amountEur)
  return out
}
