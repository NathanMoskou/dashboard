"use client"
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark")
    setDark(isDark)
    localStorage.setItem("theme", isDark ? "dark" : "light")
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        className="p-2 rounded-xl text-muted-fg hover:text-fg hover:bg-muted/30 transition-colors"
        aria-label="Wissel thema"
      >
        {dark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-fg hover:bg-muted hover:text-fg transition-colors"
      aria-label="Wissel thema"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      {dark ? "Licht thema" : "Donker thema"}
    </button>
  )
}
