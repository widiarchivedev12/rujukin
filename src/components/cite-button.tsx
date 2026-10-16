'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { formatReference } from '@/lib/cite'
import type { CitationInput, CitationStyle } from '@/lib/cite'

export function CiteButton({ citation }: { citation: CitationInput }) {
  const [copied, setCopied] = useState(false)
  const [style, setStyle] = useState<CitationStyle>('apa7')

  async function copy() {
    const text = formatReference(citation, style)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={style}
        onChange={e => setStyle(e.target.value as CitationStyle)}
        className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="apa7">APA 7</option>
        <option value="ieee">IEEE</option>
        <option value="harvard">Harvard</option>
      </select>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Tersalin!' : 'Salin Sitasi'}
      </button>
    </div>
  )
}
