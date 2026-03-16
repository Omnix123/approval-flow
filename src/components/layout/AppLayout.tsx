/**
 * AppLayout.tsx — Main Application Layout
 * 
 * PURPOSE: Provides the consistent page structure (header + navigation + content area)
 * that wraps every protected page. This component is used by ProtectedRoute in App.tsx.
 * 
 * STRUCTURE:
 * ┌──────────────────────────────────────────┐
 * │ Header (sticky top)                      │
 * │ ┌─Logo──┬──Navigation Tabs──┬─User Menu─┐│
 * │ └───────┴───────────────────┴───────────┘│
 * ├──────────────────────────────────────────┤
 * │ Main Content (children)                   │
 * │                                           │
 * └──────────────────────────────────────────┘
 * 
 * RESPONSIVE BEHAVIOR:
 * - Desktop (md+): Horizontal navigation tabs in the header
 * - Mobile (<md): Hamburger menu → slides down navigation panel
 * 
 * ADMIN-ONLY NAV:
 * The "Manage Users" link only appears for users with the 'admin' role.
 * This is a UX convenience — the actual access control is enforced by RLS policies
 * and the AdminDashboard component's own role check.
 */

import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Home,
  Plus,
  ClipboardCheck,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

/** Navigation items visible to all authenticated users */
const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/requests', label: 'All Requests', icon: FileText },
  { path: '/approvals', label: 'My Approvals', icon: ClipboardCheck },
  { path: '/create', label: 'New Request', icon: Plus },
];

/** Additional navigation items only visible to admins */
const ADMIN_ITEMS = [
  { path: '/users', label: 'Manage Users', icon: Users },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /** Sign out and redirect to login page */
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /** Extract initials from a full name (e.g., "John Mwanga" → "JM") */
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Combine standard nav items with admin items based on user role
  const allNavItems = user?.role === 'admin' ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  return (
    <div className="min-h-screen bg-background">
      {/* ==================== STICKY HEADER ==================== */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo and app name */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">EMA DocFlow</h1>
              <p className="text-xs text-muted-foreground">Document Approval System</p>
            </div>
          </Link>

          {/* Desktop navigation — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1">
            {allNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'        // Active: filled primary
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'  // Inactive: subtle
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User menu (dropdown) + mobile hamburger */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  {/* User avatar with initials */}
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {user ? getInitials(user.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Name + department (hidden on small screens) */}
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.department}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu toggle button — visible only on small screens */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile navigation panel — slides down when hamburger is clicked */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card animate-fade-in">
            <nav className="container py-4 space-y-1">
              {allNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}
