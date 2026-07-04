'use client'

import { useState, useMemo } from 'react'
import { Search, ArrowRight, QrCode as QrIcon, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useRouterStore, useUIStore } from '@/lib/stores'
import { QR_TYPES, QR_CATEGORIES, type QrTypeDef, type QrCategory } from '@/lib/qr-types'

export function TypesView() {
  const navigate = useRouterStore((s) => s.navigate)
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<QrCategory | 'all' | 'popular'>('all')

  const filtered = useMemo(() => {
    return QR_TYPES.filter((t) => {
      if (activeCat === 'popular' && !t.popular) return false
      if (activeCat !== 'all' && activeCat !== 'popular' && t.category !== activeCat) return false
      if (query) {
        const q = query.toLowerCase()
        if (!t.label.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q) && !t.useCase.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [activeCat, query])

  const openType = (t: QrTypeDef) => {
    navigate('type-page', { type: t.id })
  }

  const grouped = useMemo(() => {
    if (activeCat !== 'all' || query) return null
    return QR_CATEGORIES.map((cat) => ({ cat, types: QR_TYPES.filter((t) => t.category === cat.id) }))
  }, [activeCat, query])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
        <Badge variant="outline" className="mb-3 border-brand/30 text-brand">{QR_TYPES.length} QR types</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Every QR code type you&apos;ll ever need
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          {QR_TYPES.length}+ types across {QR_CATEGORIES.length} categories — each with its own generator, how-to and FAQ. Pick one to start.
        </p>
      </div>

      {/* Search */}
      <div className="mx-auto mb-6 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${QR_TYPES.length} QR types…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        <CatPill active={activeCat === 'all'} onClick={() => setActiveCat('all')}>
          All <span className="ml-1 text-xs opacity-70">{QR_TYPES.length}</span>
        </CatPill>
        <CatPill active={activeCat === 'popular'} onClick={() => setActiveCat('popular')}>
          Popular
        </CatPill>
        {QR_CATEGORIES.map((c) => (
          <CatPill key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
            <c.icon className="mr-1.5 h-3.5 w-3.5" />
            {c.label}
          </CatPill>
        ))}
      </div>

      {/* Grouped (default view) or filtered grid */}
      {grouped ? (
        <div className="space-y-12">
          {grouped.map(({ cat, types }) => (
            <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-muted text-brand">
                  <cat.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 id={`cat-${cat.id}`} className="text-lg font-bold tracking-tight sm:text-xl">{cat.label}</h2>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
                <Badge variant="secondary" className="ml-1">{types.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {types.map((t) => <TypeCard key={t.id} t={t} onOpen={openType} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((t) => <TypeCard key={t.id} t={t} onOpen={openType} />)}
          </div>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <QrIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No QR types match &ldquo;{query}&rdquo;.</p>
            </div>
          )}
        </>
      )}

      {/* CTA */}
      <div className="mt-16 rounded-3xl bg-brand-muted/50 p-8 text-center sm:mt-20 sm:p-12">
        <h2 className="text-2xl font-bold sm:text-3xl">Not sure which type to pick?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Start with the most popular — a Website URL QR — and customize from there.
        </p>
        <Button className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => navigate('type-page', { type: 'url' })}>
          Start with URL QR code <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function CatPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        'tap-none inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ' +
        (active ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-background hover:border-brand/40 hover:text-brand')
      }
    >
      {children}
    </button>
  )
}

function TypeCard({ t, onOpen }: { t: QrTypeDef; onOpen: (t: QrTypeDef) => void }) {
  return (
    <Card
      className="group flex flex-col rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md hover:border-brand/40"
    >
      <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-muted text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
            <t.icon className="h-5 w-5" />
          </div>
          {t.popular && <Badge variant="secondary" className="text-[10px]">Popular</Badge>}
        </div>
        <h3 className="mt-3 text-base font-semibold">{t.label}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
        <button
          onClick={() => onOpen(t)}
          className="tap-none mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          Create <ChevronRight className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  )
}

export default TypesView
