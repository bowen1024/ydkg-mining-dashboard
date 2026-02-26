import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import './globals.css'

export const metadata: Metadata = {
  title: 'YDKG Mining Dashboard',
  description: 'Mining revenue calculator and dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
