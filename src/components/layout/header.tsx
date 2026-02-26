import Link from 'next/link'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight">
            YDKG
          </h1>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            Mining Dashboard
          </span>
        </div>
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <Settings className="h-3.5 w-3.5" />
            设置
          </Button>
        </Link>
      </div>
    </header>
  )
}
