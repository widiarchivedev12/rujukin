'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type UploadState = 'idle' | 'uploading' | 'processing' | 'error'

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Hanya file PDF yang didukung')
      return
    }

    setState('uploading')
    setErrorMsg(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErrorMsg('Sesi habis, silakan login ulang')
      setState('idle')
      return
    }

    const title = decodeURIComponent(
      file.name.replace(/\.pdf$/i, '').replace(/\+/g, ' ')
    ).replace(/[_]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
    const { data: paper, error: insertErr } = await supabase
      .from('papers')
      .insert({ user_id: user.id, title, status: 'uploading' as const })
      .select('id')
      .single()

    if (insertErr || !paper) {
      setErrorMsg('Gagal membuat data jurnal')
      setState('idle')
      return
    }

    const filePath = `${user.id}/${paper.id}.pdf`
    const { error: uploadErr } = await supabase.storage
      .from('papers')
      .upload(filePath, file)

    if (uploadErr) {
      await supabase.from('papers').delete().eq('id', paper.id)
      setErrorMsg('Gagal mengunggah file')
      setState('idle')
      return
    }

    await supabase
      .from('papers')
      .update({ file_path: filePath, status: 'processing' as const })
      .eq('id', paper.id)

    setState('processing')

    const res = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId: paper.id }),
    })

    if (!res.ok) {
      setErrorMsg(res.status === 429
        ? 'Batas upload tercapai atau kuota API habis. Coba lagi nanti.'
        : 'Gagal memproses jurnal')
      setState('error')
      return
    }

    setState('idle')
    startTransition(() => router.refresh())
  }

  const isLoading = state === 'uploading' || state === 'processing'

  return (
    <div className="flex flex-col items-end gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      <Button
        onClick={() => {
          if (state === 'error') { setState('idle'); setErrorMsg(null) }
          inputRef.current?.click()
        }}
        disabled={isLoading}
      >
        {isLoading
          ? <Loader2 className="size-4 animate-spin" />
          : <Upload className="size-4" />}
        {state === 'uploading' ? 'Mengunggah…' : state === 'processing' ? 'Memproses…' : 'Upload Jurnal'}
      </Button>
      {errorMsg && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  )
}
