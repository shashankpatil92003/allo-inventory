'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Reservation = {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED'
  quantity: number
  expiresAt: string
  createdAt: string
  product: {
    name: string
    sku: string
    price: number
  }
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const skuIcon: Record<string, string> = {
  'SONY-WH-001': '🎧',
  'SAM-CH-002': '⚡',
  'YOG-VP-003': '🍫',
  'NES-GB-004': '☕',
}

export default function ReservationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/reservations/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setReservation(data)
        const diff = Math.max(
          0,
          Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)
        )
        setSecondsLeft(diff)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          setReservation((r) => (r ? { ...r, status: 'RELEASED' } : r))
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [secondsLeft])

  const handleConfirm = useCallback(async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' })
      const data = await res.json()
      if (res.status === 410) {
        toast.error('Reservation expired', { description: data.error })
        setReservation((r) => (r ? { ...r, status: 'RELEASED' } : r))
        return
      }
      if (!res.ok) {
        toast.error('Error', { description: data.error })
        return
      }
      setReservation((r) => (r ? { ...r, status: 'CONFIRMED' } : r))
      toast.success('🎉 Purchase confirmed!', { description: 'Your order has been placed.' })
    } finally {
      setActionLoading(false)
    }
  }, [id])

  const handleCancel = useCallback(async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        toast.error('Error', { description: data.error })
        return
      }
      setReservation((r) => (r ? { ...r, status: 'RELEASED' } : r))
      toast.success('Reservation cancelled', { description: 'Stock has been released.' })
    } finally {
      setActionLoading(false)
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading reservation...</p>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-slate-500 text-lg">Reservation not found.</p>
        <button onClick={() => router.push('/')}
          className="mt-4 px-6 py-2 rounded-xl text-white font-semibold"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          Back to Products
        </button>
      </div>
    )
  }

  const isPending = reservation.status === 'PENDING'
  const isConfirmed = reservation.status === 'CONFIRMED'
  const isReleased = reservation.status === 'RELEASED'
  const icon = skuIcon[reservation.product.sku] ?? '📦'
  const urgency = secondsLeft < 60

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => router.push('/')}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-600 transition-colors mb-6">
        ← Back to products
      </button>

      <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">

        {/* Top banner */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}
          className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{icon}</span>
            <div>
              <p className="text-white font-bold text-lg leading-tight">{reservation.product.name}</p>
              <p className="text-white/50 text-xs">SKU: {reservation.product.sku}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            isConfirmed
              ? 'bg-green-400/20 text-green-300 border border-green-400/30'
              : isReleased
              ? 'bg-red-400/20 text-red-300 border border-red-400/30'
              : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
          }`}>
            {reservation.status}
          </span>
        </div>

        <div className="p-6 space-y-5">

          {/* Price & Qty */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <div>
              <p className="text-xs text-slate-400 font-medium">Quantity</p>
              <p className="text-lg font-bold text-slate-800">{reservation.quantity} unit</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium">Total</p>
              <p className="text-2xl font-extrabold text-indigo-600">
                ₹{(reservation.product.price * reservation.quantity).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Countdown */}
          {isPending && (
            <div className={`rounded-xl p-4 text-center border-2 ${
              urgency
                ? 'border-red-300 bg-red-50'
                : 'border-indigo-200 bg-indigo-50'
            }`}>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${
                urgency ? 'text-red-400' : 'text-indigo-400'
              }`}>
                ⏱ Reservation expires in
              </p>
              <p className={`text-5xl font-mono font-black ${
                urgency ? 'text-red-600' : 'text-indigo-600'
              }`}>
                {formatTime(secondsLeft)}
              </p>
              {urgency && (
                <p className="text-xs text-red-500 mt-1 font-medium animate-pulse">
                  ⚠️ Hurry! Less than a minute left
                </p>
              )}
            </div>
          )}

          {/* Confirmed */}
          {isConfirmed && (
            <div className="rounded-xl p-5 text-center border-2 border-green-300 bg-green-50">
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-green-700 font-extrabold text-xl">Purchase Confirmed!</p>
              <p className="text-slate-500 text-sm mt-1">Your order has been successfully placed.</p>
            </div>
          )}

          {/* Released */}
          {isReleased && (
            <div className="rounded-xl p-5 text-center border-2 border-red-200 bg-red-50">
              <p className="text-4xl mb-2">❌</p>
              <p className="text-red-700 font-extrabold text-xl">Reservation Ended</p>
              <p className="text-slate-500 text-sm mt-1">This reservation was cancelled or expired.</p>
            </div>
          )}

          {/* Actions */}
          {isPending && (
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={actionLoading || secondsLeft === 0}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {actionLoading ? '⏳ Processing...' : '✓ Confirm Purchase'}
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl font-bold text-sm border-2 border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50">
                Cancel
              </button>
            </div>
          )}

          {(isConfirmed || isReleased) && (
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              ← Back to Products
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-slate-400 text-xs mt-4">
        Reservation ID: <span className="font-mono">{reservation.id}</span>
      </p>
    </div>
  )
}