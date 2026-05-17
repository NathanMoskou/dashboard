import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const redirect = process.env.GOOGLE_OAUTH_REDIRECT_URI
  if (!clientId || !redirect) {
    return new NextResponse(
      "Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI.",
      { status: 500 },
    )
  }
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirect)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set(
    "scope",
    [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/gmail.readonly",
      "openid",
      "email",
    ].join(" "),
  )
  return NextResponse.redirect(url.toString())
}
