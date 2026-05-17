import { verifySession } from "@/lib/dal"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { loadRoutineForUser } from "@/lib/morning/routine-data"
import { RoutineEditor } from "./RoutineEditor"

export const dynamic = "force-dynamic"

export default async function RoutinePage() {
  await verifySession()
  const blocks = await loadRoutineForUser()

  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={[{ label: "Focus", href: "/focus" }, { label: "Routine" }]} />
      <LiveHeader
        title="Mijn routine"
        subtitle="Tijden, titels en kleuren voor de Plan-routine-knop"
      />

      <Card>
        <CardHeader>
          <CardTitle>Routine-blokken</CardTitle>
          <CardDescription>
            Sleep om te herordenen. Tap een blok om de tijd, titel of kleur aan te passen. Voeg
            nieuwe blokken toe met de knop onderaan. De &ldquo;Plan routine&rdquo; knop op /focus
            gebruikt deze lijst.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoutineEditor initialBlocks={blocks} />
        </CardContent>
      </Card>
    </div>
  )
}
