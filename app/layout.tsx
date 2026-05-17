import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google"
import "./globals.css"

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Life",
  description: "Persoonlijk dashboard voor habits, focus en reflectie.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Life",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeInit = `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t==null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})()`
  return (
    <html lang="nl" className={`${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg">
        {children}
        <ServiceWorker />
      </body>
    </html>
  )
}

function ServiceWorker() {
  // Registers /sw.js, hot-swaps when a new version activates, and auto-reloads
  // the current tab exactly once after a new SW takes over so the user never
  // sees a half-broken page after a deploy.
  const script = `if('serviceWorker' in navigator){window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('/sw.js');try{reg.update()}catch(e){}reg.addEventListener('updatefound',()=>{const sw=reg.installing;if(!sw)return;sw.addEventListener('statechange',()=>{if(sw.state==='activated'&&navigator.serviceWorker.controller){if(!sessionStorage.getItem('lifeos-sw-reloaded')){sessionStorage.setItem('lifeos-sw-reloaded','1');window.location.reload()}}})})}catch(e){}})}`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
