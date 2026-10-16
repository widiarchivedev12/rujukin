'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, MessageSquare, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const navItems = [
  { href: '/library', label: 'Perpustakaan', icon: BookOpen },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
]

export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-sidebar-border bg-sidebar h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0">
        <div className="flex items-center justify-center size-7 rounded-lg bg-primary text-primary-foreground">
          <BookOpen className="size-3.5" />
        </div>
        <span className="font-semibold text-sidebar-foreground tracking-tight">Rujukin</span>
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 pt-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <Separator />

      {/* User */}
      <div className="p-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Keluar</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
