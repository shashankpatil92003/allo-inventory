'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type WarehouseStock = {
  warehouseId: string
  warehouseName: string
  city: string
  total: number
  reserved: number
  available: number
}

type Product = {
  id: string
  name: string
  sku: string
  price: number
  warehouses: WarehouseStock[]
}

const categoryIcon: Record<string, string> = {
  'SONY-WH-001': '🎧',
  'SAM-CH-002': '⚡',
  'YOG-VP-003': '🍫',
  'NES-GB-004': '☕',
}

const categoryColor: Record<string, string> = {
  'SONY-WH-001': 'from-indigo-500 to-purple-600',
  'SAM-CH-002': 'from-blue-500 to-cyan-500',
  'YOG-VP-003': 'from-orange-400 to-amber-500',
  'NES-GB-004': 'from-amber-600 to-yellow-500',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [reserving, setReserving] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        setProducts(data)
        setLoading(false)
      })
  }, [])

  async function handleReserve(productId: string, warehouseId: string) {
    const key = `${productId}-${warehouseId}`
    setReserving(key)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      })
      const data = await res.json()
      if (res.status === 409) {
        toast.error('Out of stock', { description: data.error })
        return
      }
      if (!res.ok) {
        toast.error('Error', { description: data.error || 'Something went wrong' })
        return
      }
      router.push(`/reservations/${data.id}`)
    } finally {
      setReserving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading products...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
          style={{ background: '#ede9fe', color: '#4f46e5' }}>
          🏪 4 Products · 4 Warehouses
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Browse Products
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          Reserve a product from your nearest warehouse. Hold lasts <strong>10 minutes</strong>.
        </p>
      </div>

      {/* Product Cards */}
      <div className="grid gap-6">
        {products.map((product) => {
          const icon = categoryIcon[product.sku] ?? '📦'
          const gradient = categoryColor[product.sku] ?? 'from-slate-500 to-slate-700'
          const totalAvailable = product.warehouses.reduce((sum, w) => sum + w.available, 0)

          return (
            <div key={product.id}
              className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white hover:shadow-md transition-shadow">

              {/* Card Top Banner */}
              <div className={`bg-gradient-to-r ${gradient} px-6 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{icon}</span>
                  <div>
                    <h2 className="text-white font-bold text-lg leading-tight">{product.name}</h2>
                    <p className="text-white/70 text-xs mt-0.5">SKU: {product.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-xs">Price</p>
                  <p className="text-white font-extrabold text-2xl">₹{product.price.toLocaleString()}</p>
                </div>
              </div>

              {/* Stock Info */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Stock by Warehouse
                  </p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    totalAvailable > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {totalAvailable} total available
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {product.warehouses.map((wh) => (
                    <div key={wh.warehouseId}
                      className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${
                        wh.available > 0
                          ? 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50'
                          : 'border-red-100 bg-red-50 opacity-70'
                      }`}>
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{wh.warehouseName}</p>
                        <p className="text-xs text-slate-400">📍 {wh.city}</p>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          wh.available > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {wh.available} avail
                        </span>
                        {wh.reserved > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {wh.reserved} held
                          </span>
                        )}
                      </div>
                      <button
                        disabled={
                          wh.available === 0 ||
                          reserving === `${product.id}-${wh.warehouseId}`
                        }
                        onClick={() => handleReserve(product.id, wh.warehouseId)}
                        className={`w-full text-xs font-bold py-1.5 rounded-lg transition-all ${
                          wh.available === 0
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'text-white cursor-pointer hover:opacity-90 active:scale-95'
                        }`}
                        style={wh.available > 0 ? {
                          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                        } : {}}
                      >
                        {reserving === `${product.id}-${wh.warehouseId}`
                          ? '⏳ Reserving...'
                          : wh.available === 0
                          ? 'Out of Stock'
                          : '⚡ Reserve'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-slate-400 text-sm mt-10">
        🔒 Reservations are held for 10 minutes. Stock is updated in real time.
      </p>
    </div>
  )
}