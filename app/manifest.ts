import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life",
    short_name: "Life",
    description: "Persoonlijk dashboard voor habits, focus en reflectie.",
    start_url: "/today",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf7",
    theme_color: "#1e3a8a",
    icons: [
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  }
}
