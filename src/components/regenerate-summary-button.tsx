'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RegenerateSummaryButton({ paperId }: { paperId: string }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleRegenerate() {
    setState('loading')
    setErrorMsg(null)
    const res = await fetch(`/api/paper/${paperId}`, { method: 'POST' })
    if (res.ok) {
      router.refresh()
      setState('idle')
    } else {
      const body = await res.json().catch(() => ({}))
      setErrorMsg(res.status === 429
        ? 'Kuota API habis. Coba lagi nanti.'
        : (body.error as string | undefined) ?? 'Gagal membuat ringkasan.')
      setState('error')
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={state === 'loading'}
        onClick={() => void handleRegenerate()}
      >
        {state === 'loading'
          ? <Loader2 className="size-4 animate-spin" />
          : <Sparkles className="size-4" />}
        {state === 'loading' ? 'Membuat ringkasan…' : 'Buat Ringkasan'}
      </Button>
      {errorMsg && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  )
}
