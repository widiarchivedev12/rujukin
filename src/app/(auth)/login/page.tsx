'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitLogin() {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center size-12 rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Rujukin</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Baca jurnal lebih cepat, kutip dengan benar.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Cek email kamu!</p>
            <p className="text-sm text-muted-foreground">
              Link masuk sudah dikirim ke{' '}
              <span className="font-medium text-foreground">{email}</span>.
              Klik link tersebut untuk masuk.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-sm text-primary hover:underline mt-2"
            >
              Kirim ulang ke email lain
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void submitLogin() }} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@kampus.ac.id"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Mengirim…' : 'Kirim link masuk'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Kami kirim link masuk ke email kamu. Tidak perlu password.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
