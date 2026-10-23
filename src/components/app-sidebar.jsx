"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from '@/lib/supabase/client'
import { SiGithub, SiVercel, SiSupabase, SiCloudinary, SiNextdotjs } from "react-icons/si"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  LogOut, 
  Clock, 
  Rocket, 
  KeyRound, 
  Users,
  Server,
  Settings,
  Shield,
  Inbox
} from "lucide-react"
import { Badge } from "./ui/badge"


const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    label: "Deployments",
    items: [
      { title: "Deployments", url: "/admin/dashboard/deployments", icon: Rocket },
      { title: "Uptime", url: "/admin/dashboard/uptime", icon: Clock },
    ]
  },
  {
    label: "Hosting & Vault",
    items: [
      { title: "Gallery", url: "/admin/dashboard/gallery", icon: SiCloudinary },
      { title: "Env Vault", url: "/admin/dashboard/envvault", icon: KeyRound },
    ]
  },
  {
    label: "Management",
    items: [
      { title: "Users", url: "/admin/dashboard/users", icon: Users },
    ]
  }
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
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-zinc-500 text-xs">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="">
                {group.items.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        isActive={isActive}
                        asChild
                        className="data-[active=true]:bg-zinc-900 data-[active=true]:text-white text-zinc-400 "
                      >
                        <Link href={item.url} className="flex gap-2 flex-1 items-center">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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