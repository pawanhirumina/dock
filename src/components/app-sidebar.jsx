"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  CircleDot,
  Clock,
  GitBranch,
  GitPullRequest,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Rocket,
  Terminal,
  Users,
  Workflow,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Deployments",
    items: [
      { title: "Deployments", url: "/admin/deployments", icon: Rocket },
      { title: "Uptime", url: "/admin/uptime", icon: Clock },
    ],
  },
  {
    label: "GitHub",
    items: [
      { title: "Repositories", url: "/admin/github/repositories", icon: GitBranch },
      { title: "Workflows", url: "/admin/github/workflows", icon: Workflow },
      { title: "Issues", url: "/admin/github/issues", icon: CircleDot },
      { title: "Pull requests", url: "/admin/github/pulls", icon: GitPullRequest },
      { title: "Notifications", url: "/admin/github/notifications", icon: Bell },
    ],
  },
  {
    label: "Hosting & Vault",
    items: [
      { title: "Gallery", url: "/admin/gallery", icon: ImageIcon },
      { title: "Env Vault", url: "/admin/envvault", icon: KeyRound },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
    ],
  },
]

function LogoutButton() {
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <SidebarMenuButton
      onClick={logout}
      className="text-muted-foreground hover:text-foreground"
    >
      <LogOut />
      <span>Log out</span>
    </SidebarMenuButton>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Terminal className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Dock</span>
            <span className="text-xs text-muted-foreground">
              Developer control plane
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    pathname.startsWith(`${item.url}/`)

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={<Link href={item.url} />}
                        className="data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
