// This is the main landing page of the application.
// It serves as the entry point before users navigate to the dashboard.

// Import the Next.js 'Image' component for optimized image handling.
import Image from 'next/image';
// Import the 'Link' component for client-side navigation to other pages.
import Link from 'next/link';
// Import UI components from the component library.
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  // This page serves as a welcoming landing page for the application.
  return (
    // The main container uses Flexbox to center its content both vertically and horizontally.
    // It takes up the full screen height ('min-h-screen').
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <Card className="w-full max-w-2xl shadow-xl border-2 border-border">
        <CardHeader className="items-center text-center p-8">
          {/* Main Logo for Ajinkya Infra Projects */}
          {/* <Image 
            src="" 
            width={80} 
            height={80} 
            alt="Ajinkya Infra Projects" 
            className="rounded-full mb-4 ring-4 ring-primary/20"
            data-ai-hint="logo sun"
          /> */}
          {/* Main Title and Description */}
          <CardTitle className="text-4xl font-headline tracking-tight">Future Energy Dashboard</CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2 max-w-md">
            An inventory and client material management solution for Ajinkya Infra Projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center px-8 pb-8">
          {/* Explanatory text providing more context about the dashboard's features. */}
          <p className="text-center max-w-lg mb-8 text-foreground/80">
            Track your material inventory, manage client usage, and get automated alerts for low-stock items, all in one seamless interface.
          </p>
          {/* The primary call-to-action button, linking to the main dashboard. */}
          <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
            <Link href="/dashboard">
              Enter Dashboard
              <ArrowRight className="ml-2" />
            </Link>
          </Button>
          {/* A footer section within the card for branding. */}
          <div className="mt-10 border-t pt-6 w-full flex justify-center items-center gap-4">
              <span className="text-sm text-muted-foreground">Powered by</span>
              {/* <Image 
                src="https://picsum.photos/seed/futureenergy-logo/120/40" 
                width={120} 
                height={40} 
                alt="Future Energy"
                data-ai-hint="logo modern"
              /> */}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
