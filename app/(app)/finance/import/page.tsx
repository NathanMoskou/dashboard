import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ImportForm } from "./ImportForm"

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Transacties import</h1>
        <p className="text-sm text-muted-fg">
          Sleep een Dyme-export (CSV of XLSX) hierheen. Duplicaten (zelfde datum + bedrag + omschrijving) worden
          overgeslagen.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportForm />
        </CardContent>
      </Card>
    </div>
  )
}
