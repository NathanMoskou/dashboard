/**
 * Today-page widget config.
 *
 * The Life Score hero is always rendered first — that part is non-negotiable.
 * Everything below the hero is user-controllable: pick which secondary cards
 * to show, and what order they appear in. Stored as a JSONB array in
 * user_integrations.today_widget_config.
 */

export const TODAY_WIDGET_KEYS = [
  "pending-habits",
  "agenda",
  "bucket-list",
  "notion-tasks",
] as const

export type WidgetKey = (typeof TODAY_WIDGET_KEYS)[number]

export type WidgetEntry = { key: WidgetKey; hidden: boolean }

export const WIDGET_LABELS: Record<WidgetKey, string> = {
  "pending-habits": "Nog te doen (habits)",
  "agenda": "Agenda (vandaag / morgen)",
  "bucket-list": "Verlanglijst",
  "notion-tasks": "Notion-taken",
}

export const DEFAULT_TODAY_CONFIG: WidgetEntry[] = TODAY_WIDGET_KEYS.map((k) => ({
  key: k,
  hidden: false,
}))

/**
 * Normalize a stored config back into a complete, valid array — fills in
 * any widget keys that were added since the last save, drops unknown keys,
 * preserves the user's ordering and hidden flags. Used both on render and
 * before persisting from the Settings UI.
 */
export function normalizeWidgetConfig(raw: unknown): WidgetEntry[] {
  const arr = Array.isArray(raw) ? raw : []
  const seen = new Set<WidgetKey>()
  const out: WidgetEntry[] = []
  for (const entry of arr) {
    if (entry && typeof entry === "object" && "key" in entry) {
      const k = (entry as { key: string }).key
      if ((TODAY_WIDGET_KEYS as readonly string[]).includes(k) && !seen.has(k as WidgetKey)) {
        const hidden = !!(entry as { hidden?: boolean }).hidden
        out.push({ key: k as WidgetKey, hidden })
        seen.add(k as WidgetKey)
      }
    }
  }
  for (const k of TODAY_WIDGET_KEYS) {
    if (!seen.has(k)) out.push({ key: k, hidden: false })
  }
  return out
}
