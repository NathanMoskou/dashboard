import { login, signup } from "./actions"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; message?: string }>
}) {
  const sp = await searchParams
  const isSignup = sp.mode === "signup"
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{isSignup ? "Account aanmaken" : "Welkom terug"}</CardTitle>
          <p className="text-sm text-muted-fg">Life OS &mdash; je persoonlijke dashboard</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={6}
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </div>
            {sp.error ? (
              <p className="text-sm text-bad" role="alert">
                {sp.error}
              </p>
            ) : null}
            {sp.message ? (
              <p className="text-sm text-good" role="status">
                {sp.message}
              </p>
            ) : null}
            <Button formAction={isSignup ? signup : login} className="mt-2">
              {isSignup ? "Account aanmaken" : "Log in"}
            </Button>
            <a
              href={`/login?mode=${isSignup ? "login" : "signup"}`}
              className="mt-1 text-center text-xs text-muted-fg hover:text-fg"
            >
              {isSignup ? "Heb je al een account? Log in" : "Nog geen account? Maak er een aan"}
            </a>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
