/** Best-effort project inference from email/text body — used by inbox triage. */
export function inferProject(text: string): string {
  const t = text.toLowerCase()
  if (/tuintheater|theater|hanna|isabel|tristan|premiere|première/.test(t)) return "Het Tuintheater"
  if (/vitalscan|vital\s|voeding|spijsvert/.test(t)) return "VitalScan"
  if (/\bpgs\b|platform gastvrij|smallingerland|esther|bloeister/.test(t)) return "PGS"
  if (/\btip\b|drachten/.test(t)) return "TIP"
  if (/next.?adventure|chopper/.test(t)) return "Next-Adventure"
  return "Persoonlijk"
}

/** Map UI text to actual Notion select value — Notion typo: "Binnekort" with one 'n'. */
export function uiToWanneer(ui: string): "Vandaag" | "Morgen" | "Deze week" | "Binnekort" {
  switch (ui) {
    case "Vandaag":
      return "Vandaag"
    case "Morgen":
      return "Morgen"
    case "Deze week":
      return "Deze week"
    default:
      return "Binnekort" // includes "Binnenkort" UI label
  }
}

export function wanneerToUi(value: string | null): string {
  if (value === "Binnekort") return "Binnenkort"
  return value ?? ""
}
