import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID
  const redirect = process.env.NOTION_OAUTH_REDIRECT_URI
  if (!clientId || !redirect) {
    return new NextResponse(
      "Notion OAuth is not configured. Set NOTION_OAUTH_CLIENT_ID and NOTION_OAUTH_REDIRECT_URI.",
      { status: 500 },
    )
  }
  const url = new URL("https://api.notion.com/v1/oauth/authorize")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirect)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("owner", "user")
  return NextResponse.redirect(url.toString())
}
