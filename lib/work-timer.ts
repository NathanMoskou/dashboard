/**
 * Work Timer client list — now fully DB-driven.
 * Fetched from public.clients via /work-timer page.
 */
export type WorkClientRow = {
  id: string
  name: string
  hourly_rate_eur: number
  notion_client_name: string | null
  is_active: boolean
}
