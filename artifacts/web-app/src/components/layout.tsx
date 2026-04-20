import { Link, useLocation } from "wouter";
import { CheckSquare, Plus, ArrowLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthCheck } from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
  showBack?: boolean;
  title?: string;
  actions?: React.ReactNode;
}

export function Layout({ children, showBack, title, actions }: LayoutProps) {
  const [, setLocation] = useLocation();
  const { data: health } = useHealthCheck();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                className="shrink-0 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Link href="/" className="flex items-center gap-2 group outline-none">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <CheckSquare className="w-5 h-5" />
              </div>
              <span className="font-serif font-bold text-xl tracking-tight">Taskflow</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {actions}
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {title && (
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{title}</h1>
          </div>
        )}
        {children}
      </main>

      <footer className="py-6 border-t border-border mt-auto">
        <div className="max-w-4xl mx-auto px-4 md:px-8 flex items-center justify-between text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Taskflow</p>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>{health?.status === 'ok' ? 'System Online' : 'Connecting...'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
