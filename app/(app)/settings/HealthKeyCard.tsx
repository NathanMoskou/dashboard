"use client"
import { useState, useTransition } from "react"
import { Eye, EyeOff, Copy, Check, RotateCw, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { regenerateHealthKey } from "./actions"

export function HealthKeyCard({ keyValue }: { keyValue: string | null }) {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()

  const masked = keyValue
    ? `${keyValue.slice(0, 8)}${"•".repeat(Math.max(0, keyValue.length - 12))}${keyValue.slice(-4)}`
    : null

  async function copy() {
    if (!keyValue) return
    try {
      await navigator.clipboard.writeText(keyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apple Health API key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-fg">
          Gebruik in je iOS Shortcut of Health Auto Export als{" "}
          <code className="text-xs">Authorization: Bearer &lt;key&gt;</code> bij een POST naar{" "}
          <code className="text-xs">/api/health-sync</code>.
        </p>
        {keyValue ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-2 font-mono text-xs break-all">
            <span className="flex-1">{show ? keyValue : masked}</span>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setShow((s) => !s)}
              title={show ? "Verberg" : "Toon"}
            >
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={copy} title="Kopieer">
              {copied ? <Check size={13} className="text-good" /> : <Copy size={13} />}
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-fg">
            Nog geen key gegenereerd.
          </div>
        )}
        <Button
          variant="outline"
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (
                keyValue &&
                !confirm(
                  "Vernieuwen ongedaan maakt de oude key. Bestaande iOS Shortcuts moeten je nieuwe key krijgen. Doorgaan?",
                )
              )
                return
              await regenerateHealthKey()
              router.refresh()
            })
          }
        >
          {pending ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <RotateCw size={14} />
          )}
          {keyValue ? "Vernieuw" : "Genereer key"}
        </Button>
      </CardContent>
    </Card>
  )
}
