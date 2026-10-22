"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from '@/lib/supabase/client'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { LayoutDashboard, Image, LogOut, Clock, Rocket, KeyRound, Users } from "lucide-react"

const items = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Deployments", url: "/admin/dashboard/deployments", icon:  Rocket},
  { title: "Uptime", url: "/admin/dashboard/uptime", icon: Clock },
  { title: "Gallery", url: "/admin/dashboard/gallery", icon: Image },
  { title: "Env Vault", url: "/admin/dashboard/envvault", icon: KeyRound },
  { title: "Users", url: "/admin/dashboard/users", icon: Users },
]

function LogoutButton() {
  const router = useRouter()
  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh() 
  }
  return (
    <SidebarMenuButton onClick={logout} className="text-zinc-400 hover:text-white">
      <LogOut className="w-4 h-4" />
      <span>Logout</span>
    </SidebarMenuButton>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  
  return (
    <Sidebar className="bg-black border-zinc-800">
      <SidebarHeader className="p-4">
        <h1 className="font-bold text-white">Dock</h1>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="flex gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={pathname === item.url}
                    render={<Link className="text-slate-100" href={item.url} />}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-zinc-800">
        <SidebarMenu>
          <SidebarMenuItem>
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
