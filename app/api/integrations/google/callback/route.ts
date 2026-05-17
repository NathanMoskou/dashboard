import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  if (!code) return NextResponse.redirect(new URL("/settings?error=google_no_code", req.url))
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  })
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/settings?error=google_token", req.url))
  const json = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", req.url))
  await supabase.from("user_integrations").upsert(
    {
      user_id: user.id,
      google_access_token: json.access_token,
      google_refresh_token: json.refresh_token ?? null,
      google_token_expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
    },
    { onConflict: "user_id" },
  )
  return NextResponse.redirect(new URL("/settings", req.url))
}
