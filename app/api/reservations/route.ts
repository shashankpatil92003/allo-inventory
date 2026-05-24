import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { releaseExpiredReservations } from '@/lib/cleanup'
import { z } from 'zod'

const schema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int().positive(),
})

export async function POST(req: Request) {
  await releaseExpiredReservations()

  // Idempotency key (bonus)
  const idempotencyKey = req.headers.get('Idempotency-Key')
  if (idempotencyKey) {
    const cached = await redis.get(idempotencyKey)
    if (cached) return NextResponse.json(cached, { status: 200 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { productId, warehouseId, quantity } = parsed.data

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      // Lock the stock row — this is what prevents race conditions
      const stocks = await tx.$queryRaw`
        SELECT id, total, reserved FROM "Stock"
        WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      ` as { id: string; total: number; reserved: number }[]

      if (!stocks.length) throw new Error('STOCK_NOT_FOUND')

      const stock = stocks[0]
      const available = stock.total - stock.reserved

      if (available < quantity) throw new Error('INSUFFICIENT_STOCK')

      await tx.stock.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { reserved: { increment: quantity } },
      })

      return tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          ...(idempotencyKey && { idempotencyKey }),
        },
        include: { product: true },
      })
    })

    // Cache for idempotency
    if (idempotencyKey) {
      await redis.set(idempotencyKey, reservation, { ex: 86400 })
    }

    return NextResponse.json(reservation, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'INSUFFICIENT_STOCK') {
      return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 })
    }
    if (message === 'STOCK_NOT_FOUND') {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}