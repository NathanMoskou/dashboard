import Link from "next/link"
import { verifySession } from "@/lib/dal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createTemplate } from "../actions"

export default async function TemplatesPage() {
  const { supabase } = await verifySession()
  const { data: templates } = await supabase
    .from("workout_templates")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nieuwe template</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTemplate} className="flex gap-2">
            <Input name="name" placeholder="bv. Push A" required />
            <Button type="submit">Aanmaken</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(templates ?? []).map((t) => (
          <Link
            key={t.id}
            href={`/gym/templates/${t.id}/edit`}
            className="block rounded-md border border-border bg-card p-3 hover:bg-muted"
          >
            <div className="font-medium">{t.name}</div>
          </Link>
        ))}
        {(templates ?? []).length === 0 ? (
          <p className="text-sm text-muted-fg">Nog geen templates.</p>
        ) : null}
      </div>
    </div>
  )
}
