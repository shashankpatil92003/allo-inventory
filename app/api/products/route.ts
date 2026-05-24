import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { releaseExpiredReservations } from '@/lib/cleanup'

export async function GET() {
  await releaseExpiredReservations()

  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: { warehouse: true },
      },
    },
  })

  const result = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    warehouses: p.stocks.map((s) => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      city: s.warehouse.city,
      total: s.total,
      reserved: s.reserved,
      available: s.total - s.reserved,
    })),
  }))

  return NextResponse.json(result)
}