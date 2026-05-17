import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  if (!code) return NextResponse.redirect(new URL("/settings?error=notion_no_code", req.url))

  const clientId = process.env.NOTION_OAUTH_CLIENT_ID!
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET!
  const redirect = process.env.NOTION_OAUTH_REDIRECT_URI!
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
    },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirect }),
  })
  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/settings?error=notion_token", req.url))
  }
  const json = (await tokenRes.json()) as { access_token: string; workspace_id?: string }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", req.url))
  await supabase.from("user_integrations").upsert(
    {
      user_id: user.id,
      notion_access_token: json.access_token,
      notion_workspace_id: json.workspace_id ?? null,
    },
    { onConflict: "user_id" },
  )
  return NextResponse.redirect(new URL("/settings", req.url))
}
