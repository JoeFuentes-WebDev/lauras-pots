import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { inStock: true },
      select: { category: true, tags: true },
    })

    // Distinct categories
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean)

    // Also surface common tags as browsable filters
    const allTags = products.flatMap(p => p.tags)
    const tagCounts = allTags.reduce<Record<string, number>>((acc, tag) => {
      acc[tag] = (acc[tag] ?? 0) + 1
      return acc
    }, {})
    const popularTags = Object.entries(tagCounts)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([tag]) => tag)

    return NextResponse.json({ categories, popularTags })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ categories: [], popularTags: [] })
  }
}