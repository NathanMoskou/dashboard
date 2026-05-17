import { Sidebar } from "@/components/nav/Sidebar"
import { MobileNav } from "@/components/nav/MobileNav"
import { PageWrapper } from "@/components/ui/PageWrapper"
import { CommandPalette } from "@/components/ui/CommandPalette"
import { PullToRefresh } from "@/components/ui/PullToRefresh"
import { ThemeController, type ThemeMode } from "@/components/ui/ThemeController"
import { verifySession } from "@/lib/dal"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId } = await verifySession()
  const { data: integ } = await supabase
    .from("user_integrations")
    .select("theme, dark_start_hour, dark_end_hour")
    .eq("user_id", userId)
    .maybeSingle()
  const themeMode = (integ?.theme as ThemeMode | undefined) ?? "auto-time"
  const darkStart = integ?.dark_start_hour ?? 21
  const darkEnd = integ?.dark_end_hour ?? 6

  return (
    <div className="flex h-dvh overflow-hidden">
      <ThemeController mode={themeMode} darkStartHour={darkStart} darkEndHour={darkEnd} />
      <Sidebar />
      {/* data-scroll-main lets MobileNav's scroll listener find this container */}
      <main data-scroll-main className="flex-1 flex flex-col overflow-y-auto overscroll-y-none mobile-main-pt md:pt-0 mobile-main-pb md:pb-0">
        <div className="flex-1 bg-card md:bg-transparent rounded-t-2xl md:rounded-none">
          <div className="mx-auto w-full max-w-3xl px-4 py-5 md:p-8">
            <PageWrapper>{children}</PageWrapper>
          </div>
        </div>
      </main>
      <MobileNav />
      <CommandPalette />
      <PullToRefresh />
    </div>
  )
}
