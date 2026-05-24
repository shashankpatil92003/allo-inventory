import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create warehouses
  const mumbai = await prisma.warehouse.upsert({
    where: { id: 'wh-mumbai' },
    update: {},
    create: { id: 'wh-mumbai', name: 'Mumbai Central', city: 'Mumbai' },
  })

  const delhi = await prisma.warehouse.upsert({
    where: { id: 'wh-delhi' },
    update: {},
    create: { id: 'wh-delhi', name: 'Delhi North', city: 'Delhi' },
  })

  const bangalore = await prisma.warehouse.upsert({
    where: { id: 'wh-bangalore' },
    update: {},
    create: { id: 'wh-bangalore', name: 'Bangalore Tech Park', city: 'Bangalore' },
  })

  const hyderabad = await prisma.warehouse.upsert({
    where: { id: 'wh-hyderabad' },
    update: {},
    create: { id: 'wh-hyderabad', name: 'Hyderabad Hub', city: 'Hyderabad' },
  })

  // Create products — 2 Electronics + 2 Food & Grocery
  const products = [
    { id: 'prod-1', name: 'Sony WH-1000XM5 Headphones', sku: 'SONY-WH-001', price: 24999, },
    { id: 'prod-2', name: 'Samsung 65W Super Fast Charger', sku: 'SAM-CH-002', price: 2999, },
    { id: 'prod-3', name: 'Yoga Bar Variety Pack (12 Bars)', sku: 'YOG-VP-003', price: 899, },
    { id: 'prod-4', name: 'Nescafe Gold Blend Coffee 200g', sku: 'NES-GB-004', price: 649, },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    })
  }

  // Stock across all 4 warehouses
  const stockData = [
    { productId: 'prod-1', warehouseId: mumbai.id, total: 10 },
    { productId: 'prod-1', warehouseId: delhi.id, total: 5 },
    { productId: 'prod-1', warehouseId: bangalore.id, total: 8 },
    { productId: 'prod-1', warehouseId: hyderabad.id, total: 3 },

    { productId: 'prod-2', warehouseId: mumbai.id, total: 20 },
    { productId: 'prod-2', warehouseId: delhi.id, total: 15 },
    { productId: 'prod-2', warehouseId: bangalore.id, total: 12 },
    { productId: 'prod-2', warehouseId: hyderabad.id, total: 1 }, // great for 409 test

    { productId: 'prod-3', warehouseId: mumbai.id, total: 50 },
    { productId: 'prod-3', warehouseId: delhi.id, total: 30 },
    { productId: 'prod-3', warehouseId: bangalore.id, total: 25 },
    { productId: 'prod-3', warehouseId: hyderabad.id, total: 40 },

    { productId: 'prod-4', warehouseId: mumbai.id, total: 60 },
    { productId: 'prod-4', warehouseId: delhi.id, total: 1 }, // great for 409 test
    { productId: 'prod-4', warehouseId: bangalore.id, total: 35 },
    { productId: 'prod-4', warehouseId: hyderabad.id, total: 20 },
  ]

  for (const s of stockData) {
    await prisma.stock.upsert({
      where: {
        productId_warehouseId: {
          productId: s.productId,
          warehouseId: s.warehouseId,
        },
      },
      update: {},
      create: { ...s, reserved: 0 },
    })
  }

  console.log('✅ Seed complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())