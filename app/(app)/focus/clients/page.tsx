import { verifySession } from "@/lib/dal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { addClient, updateClient } from "../actions"

export default async function ClientsPage() {
  const { supabase } = await verifySession()
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Klanten</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nieuwe klant</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addClient} className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Naam</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Uurtarief €</Label>
              <Input name="hourly_rate_eur" type="number" step="0.01" defaultValue="45" />
            </div>
            <div>
              <Label>Notion uren-DB ID</Label>
              <Input name="notion_hours_db_id" placeholder="optioneel" />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Toevoegen</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(clients ?? []).map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <form action={updateClient.bind(null, c.id)} className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-fg">id: {c.id}</div>
                </div>
                <div>
                  <Label>Tarief €/u</Label>
                  <Input
                    name="hourly_rate_eur"
                    type="number"
                    step="0.01"
                    defaultValue={c.hourly_rate_eur ?? 0}
                  />
                </div>
                <div>
                  <Label>Notion uren-DB</Label>
                  <Input name="notion_hours_db_id" defaultValue={c.notion_hours_db_id ?? ""} />
                </div>
                <div className="md:col-span-4 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={c.is_active ?? true} />
                    Actief
                  </label>
                  <Button type="submit" size="sm">
                    Opslaan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
