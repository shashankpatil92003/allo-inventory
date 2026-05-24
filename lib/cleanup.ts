import { prisma } from '@/lib/prisma'

export async function releaseExpiredReservations() {
  const expired = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
  })

  for (const r of expired) {
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: r.id },
        data: { status: 'RELEASED' },
      }),
      prisma.stock.update({
        where: {
          productId_warehouseId: {
            productId: r.productId,
            warehouseId: r.warehouseId,
          },
        },
        data: { reserved: { decrement: r.quantity } },
      }),
    ])
  }
}