'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import type { Product, FavoriteItem } from '@/types'
import { formatPrice } from '@/lib/pricing'

type Props = {
  product: Product
  onSwipeRight: (item: FavoriteItem) => void
  onSwipeLeft: () => void
  onPin: (item: FavoriteItem) => void
  remaining: number
  fullBleed?: boolean
  startExpanded?: boolean
}

export function SwipeCard({ product, onSwipeRight, onSwipeLeft, onPin, remaining, startExpanded }: Props) {
  const [expanded, setExpanded] = useState(startExpanded ?? false)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const didDrag = useRef(false)
  const threshold = 100

  const handleDragStart = (clientX: number) => {
    startX.current = clientX
    setIsDragging(true)
    didDrag.current = false
  }

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return
    const delta = clientX - startX.current
    if (Math.abs(delta) > 5) didDrag.current = true
    setDragX(delta)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    if (dragX > threshold) {
      onSwipeRight({ product })
    } else if (dragX < -threshold) {
      onSwipeLeft()
    } else if (!didDrag.current) {
      setExpanded((e) => !e)
    }
    setDragX(0)
  }

  const rotation = dragX / 15
  const likeOpacity = Math.min(dragX / threshold, 1)
  const nopeOpacity = Math.min(-dragX / threshold, 1)

  return (
    <div
      className="relative select-none touch-none w-full"
      style={{
        transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
      onMouseLeave={() => { if (isDragging) handleDragEnd() }}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
      onTouchEnd={handleDragEnd}
    >
      <div className="bg-white overflow-hidden">
        {/* Full-bleed photo */}
        <div className="relative w-full h-[420px]">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            draggable={false}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Like / Nope overlays */}
          <div
            className="absolute top-8 left-6 border-4 border-green-400 text-green-400 font-black text-3xl px-3 py-1 rounded-lg rotate-[-15deg]"
            style={{ opacity: likeOpacity }}
          >LIKE</div>
          <div
            className="absolute top-8 right-6 border-4 border-red-400 text-red-400 font-black text-3xl px-3 py-1 rounded-lg rotate-[15deg]"
            style={{ opacity: nopeOpacity }}
          >SKIP</div>

          {remaining > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs px-3 py-1 rounded-full">
              {remaining} pieces
            </div>
          )}

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
            <h2 className="text-white text-xl font-bold drop-shadow-lg">{product.name}</h2>
          </div>
        </div>

        {/* Tap hint */}
        <div
          className="text-center py-1.5 bg-white border-t border-stone-100 cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          <p className="text-stone-400 text-xs">
            {expanded ? 'tap to collapse' : 'tap to expand'}
          </p>
        </div>

        {/* Expandable detail panel */}
        <div
          className="overflow-y-auto transition-all duration-300 ease-in-out"
          style={{ maxHeight: expanded ? '60vh' : '0px' }}
        >
          <div className="px-5 pt-4 pb-5 space-y-4">
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-stone-100 text-stone-500 px-3 py-1 rounded-full capitalize">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {product.description && (
              <p className="text-sm text-stone-500 leading-relaxed">{product.description}</p>
            )}

            <div className="text-center">
              <span className="text-3xl font-black text-stone-900">{formatPrice(product.basePrice)}</span>
              {product.pieceCount > 1 && (
                <span className="text-sm text-stone-400 ml-2">{product.pieceCount} pieces</span>
              )}
            </div>

            {/* Action buttons in expanded view */}
            <div className="flex items-center gap-3 justify-center pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); onSwipeLeft() }}
                className="w-14 h-14 rounded-full bg-stone-50 border-2 border-red-200 text-red-400 text-xl flex items-center justify-center hover:scale-110 hover:border-red-400 transition-all"
                aria-label="Skip"
              >✕</button>
              <button
                onClick={(e) => { e.stopPropagation(); onSwipeRight({ product }) }}
                className="w-20 h-20 rounded-full bg-stone-50 border-2 border-green-200 text-green-500 text-3xl flex items-center justify-center hover:scale-110 hover:border-green-400 transition-all"
                aria-label="Add to cart"
              >♥</button>
              <button
                onClick={(e) => { e.stopPropagation(); onPin({ product }) }}
                className="w-14 h-14 rounded-full bg-stone-50 border-2 border-amber-200 text-amber-500 text-xl flex items-center justify-center hover:scale-110 hover:border-amber-400 transition-all"
                aria-label="Save for later"
              >📌</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}