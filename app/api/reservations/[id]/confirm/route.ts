import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  if (reservation.status !== 'PENDING') {
    return NextResponse.json({ error: `Reservation is already ${reservation.status}` }, { status: 400 })
  }

  if (reservation.expiresAt < new Date()) {
    // Release the hold since it expired
    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: 'RELEASED' } }),
      prisma.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reserved: { decrement: reservation.quantity } },
      }),
    ])
    return NextResponse.json({ error: 'Reservation has expired' }, { status: 410 })
  }

  const updated = await prisma.$transaction([
    prisma.reservation.update({ where: { id }, data: { status: 'CONFIRMED' } }),
    prisma.stock.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: {
        total: { decrement: reservation.quantity },
        reserved: { decrement: reservation.quantity },
      },
    }),
  ])

  return NextResponse.json(updated[0])
}