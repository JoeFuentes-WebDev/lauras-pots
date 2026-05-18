'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type HeroImage = {
  id: string
  imageUrl: string
  alt?: string
}

export default function SplashPage() {
  const [images, setImages] = useState<HeroImage[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [pills, setPills] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/hero').then(r => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) setImages(data)
    })

    fetch('/api/categories').then(r => r.json()).then((data) => {
      const cats = (data.categories ?? []) as string[]
      const tags = (data.popularTags ?? []) as string[]
      const combined = [...new Set([...cats, ...tags])]
      setPills(combined)
    })
  }, [])

  useEffect(() => {
    if (images.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIdx(i => (i + 1) % images.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [images.length])

  const current = images[currentIdx]

  const handlePill = (value: string) => {
    router.push(`/shop?q=${encodeURIComponent(value)}`)
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-stone-900">
      {current && (
        <div className="absolute inset-0">
          <Image
            key={current.id}
            src={current.imageUrl}
            alt={current.alt ?? "Laura's Pots"}
            fill
            className="object-cover opacity-70 transition-opacity duration-1000"
            priority
          />
        </div>
      )}
      {images.length === 0 && (
        <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-950" />
      )}

      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 w-full max-w-lg text-center">
        <div className="bg-black/30 backdrop-blur-sm rounded-3xl px-8 py-6">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Laura&apos;s Pots
          </h1>
          <p className="text-white/60 mt-1 text-sm">
            Handmade pottery, one piece at a time
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          {/* Show All — always first */}
          <button
            onClick={() => handlePill('')}
            className="bg-white/30 backdrop-blur-sm border border-white/50 text-white font-bold px-5 py-2.5 rounded-full hover:bg-white/40 transition-all text-sm"
          >
            Show All
          </button>

          {/* Dynamic pills from DB — raw values, capitalize for display */}
          {pills.map((pill) => (
            <button
              key={pill}
              onClick={() => handlePill(pill)}
              className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-medium px-5 py-2.5 rounded-full hover:bg-white/30 transition-all text-sm capitalize"
            >
              {pill}
            </button>
          ))}

          {pills.length === 0 && (
            <p className="text-white/40 text-sm">Loading...</p>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 mt-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIdx ? 'bg-white w-6' : 'bg-white/40 w-1.5'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}