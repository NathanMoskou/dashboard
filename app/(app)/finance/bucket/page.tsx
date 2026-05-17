import { verifySession } from "@/lib/dal"
import { formatEUR } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { addBucketItem, toggleBucket } from "../actions"

export default async function BucketPage() {
  const { supabase } = await verifySession()
  const { data: items } = await supabase
    .from("bucket_list_items")
    .select("*")
    .order("is_completed", { ascending: true })
    .order("priority", { ascending: true })

  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={[{ label: "Financiën", href: "/finance" }, { label: "Bucket list" }]} />
      <LiveHeader title="Bucket list" subtitle="Spaardoelen & wensen" />

      <Card>
        <CardHeader>
          <CardTitle>Nieuw doel</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addBucketItem} className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Titel</Label>
              <Input name="title" required />
            </div>
            <div>
              <Label>Geschat €</Label>
              <Input name="estimated_cost_eur" type="number" step="0.01" />
            </div>
            <div>
              <Label>Prioriteit</Label>
              <select
                name="priority"
                defaultValue="2"
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              >
                <option value="1">1 — hoog</option>
                <option value="2">2 — middel</option>
                <option value="3">3 — laag</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <Button type="submit">Toevoegen</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(items ?? []).map((it) => (
          <Card key={it.id} className={it.is_completed ? "opacity-60" : ""}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{it.title}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-fg">
                  {it.estimated_cost_eur ? (
                    <Badge variant="outline">{formatEUR(Number(it.estimated_cost_eur))}</Badge>
                  ) : null}
                  <Badge variant="outline">prio {it.priority}</Badge>
                  {it.is_completed ? <Badge variant="good">voltooid</Badge> : null}
                </div>
              </div>
              <form action={toggleBucket.bind(null, it.id, !!it.is_completed)}>
                <Button type="submit" size="sm" variant={it.is_completed ? "ghost" : "good"}>
                  {it.is_completed ? "Heropen" : "Klaar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
