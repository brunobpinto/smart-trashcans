"use client"

import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Gauge, MapPin, Trash2, Users, BrushCleaning, FolderClock, Settings, LogOut } from "lucide-react"
import logoNameDark from "../../public/logo-name-dark.svg"
import type { StaticImageData } from "next/image"
import Image from "next/image";
import Link from "next/link";

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
  SidebarTrigger,
  SidebarSeparator,
} from "~/components/ui/sidebar"

// Menu items for the main section
const mainItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Gauge,
  },
  {
    title: "Locations",
    url: "/locations",
    icon: MapPin,
  }
]

// Menu items for the tables section
const tableItems = [
  {
    title: "Trashcans",
    url: "/trashcans",
    icon: Trash2,
  },
  {
    title: "Employees",
    url: "/employees",
    icon: Users,
  },
  {
    title: "Cleanups",
    url: "/cleanups",
    icon: BrushCleaning,
  },
  {
    title: "Statuses",
    url: "/statuses",
    icon: FolderClock,
  },
]

// Menu items for the settings section
const settingsItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Log Out",
    url: "#logout",
    icon: LogOut,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (!url || url === "#") return false
    if (!pathname) return false
    if (url === "/") return pathname === "/"
    return pathname.startsWith(url)
  }

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="relative flex items-center justify-center pt-4 pb-6 group-data-[state=collapsed]:pb-2">
        <Image
          src={logoNameDark as StaticImageData}
          alt="Smart Trashcans"
          width={170}
          className="-ml-6 mt-2 group-data-[collapsible=icon]:hidden"
          priority
        />
        <SidebarTrigger
          className="absolute right-3 top-5 size-7 group-data-[collapsible=icon]:static group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:right-auto group-data-[collapsible=icon]:top-auto"
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>MAIN</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>TABLES</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tableItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupLabel>SETTINGS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.title === "Log Out" ? (
                    <SidebarMenuButton
                      isActive={false}
                      tooltip={item.title}
                      onClick={() =>
                        signOut({
                          callbackUrl: "/sign-in",
                        })
                      }
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}