import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/app-sidebar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex min-h-svh w-full flex-col bg-background text-foreground">
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium">Control plane</span>
          <span className="ml-auto hidden max-w-60 truncate text-xs text-muted-foreground sm:block">
            {user.email}
          </span>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
