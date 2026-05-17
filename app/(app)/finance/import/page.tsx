import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { ImportForm } from "./ImportForm"

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={[{ label: "Financiën", href: "/finance" }, { label: "Import" }]} />
      <LiveHeader
        title="Transacties import"
        subtitle="CSV of XLSX · duplicaten worden overgeslagen"
      />
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
