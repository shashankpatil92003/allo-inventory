import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Allo Inventory',
  description: 'Inventory reservation system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">📦</span>
            <span className="text-xl font-bold text-white tracking-tight">
              Allo <span style={{ color: '#a5b4fc' }}>Inventory</span>
            </span>
          </a>
          <span className="text-xs font-medium px-3 py-1 rounded-full text-white"
            style={{ background: 'rgba(165,180,252,0.15)', border: '1px solid rgba(165,180,252,0.3)' }}>
            ⚡ Live Stock
          </span>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}