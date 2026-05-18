'use client'

import { useState, useEffect } from 'react'

type Props = {
  onSearch: (query: string) => void
  loading?: boolean
  dark?: boolean
}

export function PromptInput({ onSearch, loading, dark }: Props) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then((data) => {
      const cats = (data.categories ?? []) as string[]
      const tags = (data.popularTags ?? []) as string[]
      setSuggestions([...new Set([...cats, ...tags])])
    }).catch(() => {})
  }, [])

  const handleSubmit = () => {
    if (value.trim()) onSearch(value.trim())
  }

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder='Try "vase" or "stoneware"...'
          className={`flex-1 rounded-2xl border-2 px-5 py-3 focus:outline-none transition-colors ${
            dark
              ? 'bg-white/20 backdrop-blur-sm border-white/30 text-white placeholder-white/50 focus:border-white/60'
              : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400 focus:border-stone-800'
          }`}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !value.trim()}
          className={`rounded-2xl px-6 py-3 font-semibold transition-colors disabled:opacity-50 ${
            dark
              ? 'bg-white text-stone-900 hover:bg-stone-100'
              : 'bg-stone-900 text-white hover:bg-stone-700'
          }`}
        >
          {loading ? '...' : 'Go'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => { setValue(s); onSearch(s) }}
              className={`text-sm px-3 py-1 rounded-full transition-colors capitalize ${
                dark
                  ? 'bg-white/20 text-white/80 hover:bg-white/30 backdrop-blur-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}