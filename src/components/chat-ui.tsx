'use client'

import { useChat } from '@ai-sdk/react'
import { isTextUIPart, isDataUIPart } from 'ai'
import { Send, MessageSquare, Plus, Clock, Loader2, Trash2, AlertCircle, X } from 'lucide-react'
import { useRef, useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { PaperFilter, type PaperItem } from '@/components/paper-filter'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CitationCards } from '@/components/citation-cards'
import { citationSourceSchema } from '@/types/chat'
import type { ChatMessage, ChatDataTypes, CitationSource } from '@/types/chat'

interface RecentConversation {
  id: string
  title: string
  createdAt: string
}

interface ChatUIProps {
  conversationId: string | null
  initialMessages: ChatMessage[]
  recentConversations: RecentConversation[]
  papers: PaperItem[]
}

function extractText(message: ChatMessage): string {
  for (const part of message.parts) {
    if (isTextUIPart(part)) return part.text
  }
  return ''
}

function extractCitations(message: ChatMessage): CitationSource[] {
  for (const part of message.parts) {
    if (isDataUIPart<ChatDataTypes>(part) && part.type === 'data-citations') {
      return part.data
    }
  }
  return []
}

export function ChatUI({ conversationId: initialConvId, initialMessages, recentConversations: initialConversations, papers }: ChatUIProps) {
  const router = useRouter()
  const [convId, setConvId] = useState<string | null>(initialConvId)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([])
  const conversations = initialConversations.filter(c => !deletedIds.has(c.id))

  async function deleteConversation(id: string) {
    await fetch(`/api/conversation/${id}`, { method: 'DELETE' })
    setDeletedIds(prev => new Set([...prev, id]))
    if (id === convId) router.push('/chat')
  }
  const savedCountRef = useRef(initialMessages.length)

  const { messages, sendMessage, status, error } = useChat<ChatMessage>({
    messages: initialMessages,
    dataPartSchemas: {
      citations: z.array(citationSourceSchema),
    },
    onFinish: async ({ messages: allMessages, isError, isAbort }) => {
      if (isError || isAbort) return

      const newMessages = allMessages.slice(savedCountRef.current)
      if (newMessages.length === 0) return

      const id = convId ?? crypto.randomUUID()
      if (!convId) {
        setConvId(id)
        router.replace(`/chat?id=${id}`)
      }

      const title = savedCountRef.current === 0
        ? (extractText(allMessages[0]) ?? '').slice(0, 60) || 'Percakapan'
        : undefined

      await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: id,
          title,
          messages: newMessages.map(m => ({
            role: m.role,
            content: extractText(m),
            citations: extractCitations(m),
          })),
        }),
      })

      savedCountRef.current = allMessages.length
    },
  })

  const [dismissedError, setDismissedError] = useState<Error | null>(null)
  const showError = error != null && error !== dismissedError

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isStreaming = status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = useCallback(() => {
    const text = inputRef.current?.value.trim()
    if (!text || isStreaming) return
    const body = selectedPaperIds.length > 0 ? { paperIds: selectedPaperIds } : undefined
    void sendMessage({ text }, body ? { body } : undefined)
    if (inputRef.current) inputRef.current.value = ''
  }, [sendMessage, isStreaming, selectedPaperIds])

  return (
    <div className="flex h-full">
      {/* Conversation history sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-border">
        <div className="flex h-11 items-center justify-between px-3 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Riwayat
          </span>
          <Button variant="ghost" size="icon" className="size-7" asChild>
            <a href="/chat" title="Chat baru">
              <Plus className="size-3.5" />
            </a>
          </Button>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto">
          <div className="p-1.5 space-y-0.5">
            {conversations.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                Belum ada percakapan
              </p>
            ) : (
              conversations.map(c => (
                <div
                  key={c.id}
                  className={`flex items-center gap-1 rounded-lg text-xs transition-colors ${
                    c.id === convId
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <a
                    href={`/chat?id=${c.id}`}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2"
                  >
                    <Clock className="size-3 shrink-0 opacity-60" />
                    <span className="truncate leading-snug">{c.title}</span>
                  </a>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="mr-1 shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus percakapan?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Percakapan &quot;{c.title}&quot; akan dihapus permanen dan tidak bisa dikembalikan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => void deleteConversation(c.id)}
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center space-y-3 max-w-xs">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <MessageSquare className="size-7 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Tanya tentang jurnalmu</p>
                  <p className="text-sm text-muted-foreground">
                    Setiap jawaban disertai sumber dan nomor halaman dari jurnal yang kamu upload.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[78%] space-y-1 ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}
                    >
                      {message.parts.map((part, i) => {
                        if (!isTextUIPart(part)) return null
                        if (message.role === 'user') {
                          return <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                        }
                        return (
                          <ReactMarkdown
                            key={i}
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>,
                              li: ({ children }) => <li>{children}</li>,
                              code: ({ children }) => <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs">{children}</code>,
                              pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded-lg bg-black/10 p-3 font-mono text-xs">{children}</pre>,
                              blockquote: ({ children }) => <blockquote className="mb-2 border-l-2 border-foreground/30 pl-3 italic opacity-80">{children}</blockquote>,
                              h1: ({ children }) => <h1 className="mb-1 text-base font-bold">{children}</h1>,
                              h2: ({ children }) => <h2 className="mb-1 font-semibold">{children}</h2>,
                              h3: ({ children }) => <h3 className="mb-1 font-semibold">{children}</h3>,
                            }}
                          >
                            {part.text}
                          </ReactMarkdown>
                        )
                      })}
                    </div>

                    {message.role === 'assistant' &&
                      message.parts.map((part, i) => {
                        if (!isDataUIPart<ChatDataTypes>(part)) return null
                        if (part.type !== 'data-citations') return null
                        return <CitationCards key={i} citations={part.data} />
                      })
                    }
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Error banner */}
        {showError && (
          <div className="mx-3 mb-1 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">
              {/429|rate.?limit|too many/i.test(error!.message)
                ? 'Batas percakapan tercapai (10/menit). Tunggu sebentar lalu coba lagi.'
                : /quota|resource_exhausted/i.test(error!.message)
                  ? 'Kuota API habis. Coba lagi nanti.'
                  : 'Terjadi kesalahan. Coba kirim ulang.'}
            </span>
            <button onClick={() => setDismissedError(error!)} className="ml-1 shrink-0 opacity-60 hover:opacity-100">
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Paper filter */}
        <PaperFilter
          papers={papers}
          selected={selectedPaperIds}
          onChange={setSelectedPaperIds}
        />

        {/* Input */}
        <div className="border-t border-border p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); submit() }}
            className="flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              placeholder="Tanya tentang jurnalmu…"
              disabled={isStreaming}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isStreaming}
              className="shrink-0"
              aria-label="Kirim"
            >
              {isStreaming
                ? <Loader2 className="size-4 animate-spin" />
                : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
