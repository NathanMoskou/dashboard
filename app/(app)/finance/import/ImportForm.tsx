"use client"
import { useRef, useState, useTransition } from "react"
import { Upload, Check, Loader2, FileText, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { importCsv } from "../actions"
import { cn } from "@/lib/utils"

export function ImportForm() {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [hover, setHover] = useState(false)
  // Default ON — Dyme exports the full history each time, so a clean
  // wipe-and-replace avoids duplicate / stale data.
  const [replace, setReplace] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(f: File | null | undefined) {
    if (!f) return
    const lower = f.name.toLowerCase()
    const ok =
      lower.endsWith(".csv") ||
      lower.endsWith(".xlsx") ||
      lower.endsWith(".xls") ||
      lower.endsWith(".xlsm")
    if (!ok) {
      setResult(`"${f.name}" wordt niet ondersteund (alleen .csv / .xlsx)`)
      return
    }
    setFile(f)
    setResult(null)
  }

  function upload() {
    if (!file) return
    const fd = new FormData()
    fd.append("csv", file)
    fd.append("replace", replace ? "true" : "false")
    start(async () => {
      const r = await importCsv(fd)
      if (r.ok) {
        if (r.mode === "replace") {
          setResult(
            `Vervangen: ${r.wiped ?? 0} oude rij(en) verwijderd, ${r.inserted} nieuwe geïmporteerd.`,
          )
        } else {
          setResult(
            `Toegevoegd: ${r.inserted} • Overgeslagen (duplicaat): ${r.skipped ?? 0}`,
          )
        }
      } else setResult(`Fout: ${r.error}`)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ""
    })
  }

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          setHover(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!hover) setHover(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          if (e.currentTarget === e.target) setHover(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setHover(false)
          pickFile(e.dataTransfer.files?.[0])
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 px-6 py-10 cursor-pointer transition-colors",
          hover ? "border-fg bg-muted" : "border-border hover:bg-muted",
        )}
      >
        {file ? (
          <>
            <FileText size={28} />
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-fg">{(file.size / 1024).toFixed(1)} KB</p>
          </>
        ) : (
          <>
            <Upload size={28} className="text-muted-fg" />
            <p className="text-sm font-medium">Sleep je CSV of Excel hierheen</p>
            <p className="text-xs text-muted-fg">.csv / .xlsx — of klik om er één te kiezen</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {/* Replace toggle — explicit so destructive mode is never hidden */}
      <label className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={replace}
          onChange={(e) => setReplace(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <div className="text-xs">
          <div className="font-semibold text-fg">Vervang alle bestaande transacties</div>
          <div className="text-muted-fg mt-0.5">
            Wist eerst de hele transactie-tabel, importeert dan dit bestand. Aanbevolen
            voor Dyme-exports die altijd de volledige historie bevatten.
          </div>
        </div>
      </label>

      <div className="flex items-center gap-2">
        <Button onClick={upload} disabled={!file || pending} className="flex-1">
          {pending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
          {pending ? "Bezig..." : replace ? "Vervang & importeer" : "Importeer"}
        </Button>
        {file ? (
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setFile(null)
              if (inputRef.current) inputRef.current.value = ""
            }}
          >
            Wis
          </Button>
        ) : null}
      </div>

      {result ? <p className="text-sm">{result}</p> : null}

      {replace ? (
        <p className="flex items-start gap-1.5 text-xs text-muted-fg">
          <AlertTriangle size={12} className="text-warn mt-0.5 shrink-0" />
          <span>Vervang-modus actief — al je oude transacties worden gewist voor de nieuwe rijen worden toegevoegd.</span>
        </p>
      ) : (
        <p className="text-xs text-muted-fg">
          Toevoeg-modus: duplicaten (zelfde datum + bedrag + omschrijving) worden overgeslagen.
        </p>
      )}
    </div>
  )
}
