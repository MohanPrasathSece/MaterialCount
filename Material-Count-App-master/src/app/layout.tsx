// This file defines the root layout for the entire application.
// It wraps around all other pages and components.

// Import the 'Metadata' type from Next.js for setting page metadata (e.g., title, description).
import type { Metadata } from 'next';
// Import the global stylesheet.
import './globals.css';
// Import the 'Toaster' component which is responsible for displaying pop-up notifications (toasts).
import { Toaster } from "@/components/ui/toaster";
// Import a utility function for combining CSS classes.
import { cn } from "@/lib/utils";
// Import the main layout component which includes the sidebar.
import AppLayout from '@/components/layout/AppLayout';

// 'metadata' is an object that Next.js uses to set the <meta> tags in the HTML <head>.
// This is important for SEO and browser tab information.
export const metadata: Metadata = {
  title: 'Future Energy Dashboard',
  description: 'Inventory and client material management for Ajinkya Infra Projects',
};

// This is the root layout component.
// It receives 'children', which will be the content of the currently active page.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    // The 'html' tag is the root of the document.
    // 'suppressHydrationWarning' is used here to prevent a common warning when using themes or other
    // client-side-only logic that might cause a mismatch between the server-rendered and client-rendered HTML.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for performance. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Link to the Google Fonts stylesheet. */}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      {/* The 'body' tag contains the visible content of the page.
          'cn' is used to combine multiple CSS classes. Here, it sets the default font, anti-aliasing,
          minimum height, and background color. */}
      <body className={cn("font-body antialiased", "min-h-screen bg-background")}>
        {/* AppLayout provides the main structure, including the sidebar and header. 
            The AppLayout itself will determine if the sidebar should be shown based on the route. */}
        <AppLayout>
          {/* 'children' will be rendered inside the AppLayout. This is where the page content goes. */}
          {children}
        </AppLayout>
        {/* The Toaster component is placed at the end of the body to handle toast notifications globally. */}
        <Toaster />
      </body>
    </html>
  );
}
