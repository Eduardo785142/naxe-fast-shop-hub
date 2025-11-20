import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Palette,
  Settings,
  LogOut,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Produtos", href: "/products", icon: Package },
  { name: "Personalizar", href: "/customize", icon: Palette },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-border px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-purple-blue shadow-glow-primary">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-space text-xl font-bold">Naxe Fast Shop</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.name} to={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 font-inter text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-purple-blue text-white shadow-elegant"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="border-t border-border p-4">
            <Button
              onClick={signOut}
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground font-inter"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-purple-blue shadow-glow-primary">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-space text-xl font-bold">Naxe Fast Shop</span>
          </div>
          <Button
            onClick={signOut}
            variant="ghost"
            size="icon"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        <div className="p-6 lg:p-8">
          {children}
        </div>

        {/* Mobile navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-card/80 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-around p-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.name} to={item.href}>
                  <div
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl p-2 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-inter text-xs">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
