// This is a Client Component, which is necessary because it uses client-side hooks like `usePathname`.
"use client";

// Import the main sidebar component system from the UI library.
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
// Import icons that will be used in the sidebar navigation.
import { LayoutDashboard, Package, Users, ShoppingCart } from "lucide-react";
// Import Next.js's hook for accessing the current URL's pathname.
import { usePathname } from "next/navigation";
// Import the Next.js Image component for optimized image handling.
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

// This is the main layout component for the application. It wraps around the page content
// and provides the consistent sidebar and header structure.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Get the current path from the URL (e.g., "/dashboard", "/stock").
  const pathname = usePathname();

  // Determine if the full app layout (with sidebar and header) should be shown.
  // For this app, we only want to hide it on the root landing page ('/').
  const showAppLayout = pathname !== "/";

  // Derive a human-friendly current page label for the header.
  const currentPageLabel = (() => {
    if (!pathname) return "";
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/stock")) return "Stock";
    if (pathname.startsWith("/client-material")) return "Client Material";
    if (pathname === "/needs-to-buy") return "Needs to Buy";
    // Fallback to the first path segment capitalized
    const seg = pathname.split("/").filter(Boolean)[0] || "";
    return seg ? seg.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
  })();

  // If we are on a page that shouldn't have the main layout (like the landing page),
  // we simply render the children directly without any of the wrapping layout components.
  if (!showAppLayout) {
    return <>{children}</>;
  }

  // If we are on any other page, render the full layout with the sidebar.
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          {/* Header section of the sidebar, containing the logo and project name. */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold font-headline text-sidebar-foreground">
                Ajinkya
              </h2>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {/* The main navigation menu within the sidebar. */}
          <SidebarMenu>
            {/* Each menu item is a link to a different page. */}
            <SidebarMenuItem>
              {/* 'isActive' prop highlights the link if its path matches the current URL. */}
              <SidebarMenuButton
                asChild
                isActive={pathname === "/dashboard"}
                className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow data-[active=true]:border data-[active=true]:border-primary"
              >
                <a href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/stock")}
                className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow data-[active=true]:border data-[active=true]:border-primary"
              >
                <a href="/stock">
                  <Package />
                  <span>Stock</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/client-material")}
                className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow data-[active=true]:border data-[active=true]:border-primary"
              >
                <a href="/client-material">
                  <Users />
                  <span>Client Material</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/needs-to-buy"}
                className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow data-[active=true]:border data-[active=true]:border-primary"
              >
                <a href="/needs-to-buy">
                  <ShoppingCart />
                  <span>Needs to Buy</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      {/* 'SidebarInset' is the main content area that is pushed to the right of the sidebar. */}
      <SidebarInset>
        {/* A sticky header at the top of the main content area. */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background/80 backdrop-blur-sm md:px-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <SidebarTrigger />
            <div className="flex-shrink overflow-hidden">
              <h1 className="text-base font-semibold truncate font-headline text-foreground sm:text-xl">
                Ajinkya Infra Projects
                {/* This span is hidden by default (mobile) and shown only on 'sm' screens and up */}
                <span className="hidden sm:inline">
                  {" "}
                  | Future Energy Dashboard
                </span>
              </h1>
            </div>
          </div>
          {/* Explicit current page indicator */}
          {currentPageLabel ? (
            <Badge variant="secondary" className="whitespace-nowrap">
              {currentPageLabel}
            </Badge>
          ) : null}
        </header>
        {/* The actual page content ('children') is rendered here. */}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
