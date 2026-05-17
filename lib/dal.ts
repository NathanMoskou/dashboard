import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const verifySession = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { userId: user.id, email: user.email ?? "", supabase }
})

export const getRestConfig = cache(async () => {
  const { supabase, userId } = await verifySession()
  const { data } = await supabase
    .from("rest_config")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  return data
})
