'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Copy, Check, Image as ImageIcon, Code2, Twitter, Facebook, Linkedin,
  MessageCircle, Loader2, Share2, ExternalLink,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { getQrDataUrl } from '@/lib/qr-generate'
import type { QrCodeRecord } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  code: QrCodeRecord
}

const SHARE_BASE = 'https://createanqrcode.com/q'

export function ShareDialog({ open, onOpenChange, code }: ShareDialogProps) {
  const isDynamic = !!code.isDynamic && !!code.shortCode
  const shortUrl = isDynamic ? `${SHARE_BASE}/${code.shortCode}` : (code.staticPayload || code.destinationUrl || '')
  const shareText = `Check out this QR code: ${code.title}`
  const encodedUrl = encodeURIComponent(shortUrl)
  const encodedText = encodeURIComponent(shareText)

  const [embedCode, setEmbedCode] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copiedKind, setCopiedKind] = useState<'link' | 'embed' | null>(null)

  // Pre-render the QR data URL + embed snippet lazily once the dialog opens so
  // the copy-as-image / copy-embed actions are instant.
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setQrDataUrl(null)
    setEmbedCode('')
    getQrDataUrl(
      code.staticPayload || code.destinationUrl || '',
      code.design,
      code.logoDataUrl,
      512,
    )
      .then((url) => {
        if (cancelled) return
        setQrDataUrl(url)
        if (isDynamic) {
          setEmbedCode(
            `<a href="${shortUrl}"><img src="${url}" alt="${escapeHtml(code.title)}" width="256" height="256" /></a>`,
          )
        } else {
          setEmbedCode(
            `<img src="${url}" alt="${escapeHtml(code.title)}" width="256" height="256" />`,
          )
        }
      })
      .catch(() => {
        if (cancelled) return
        toast.error('Could not render QR image')
      })
    return () => { cancelled = true }
  }, [open, code, isDynamic, shortUrl])

  function flash(kind: 'link' | 'embed') {
    setCopiedKind(kind)
    setTimeout(() => setCopiedKind(null), 2000)
  }

  async function copyLink() {
    if (!shortUrl) { toast.error('Nothing to copy'); return }
    try {
      await navigator.clipboard.writeText(shortUrl)
      flash('link')
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  async function copyEmbed() {
    if (!embedCode) { toast.error('Embed code is still generating…'); return }
    try {
      await navigator.clipboard.writeText(embedCode)
      flash('embed')
      toast.success('Embed code copied')
    } catch {
      toast.error('Failed to copy embed code')
    }
  }

  async function copyAsImage() {
    if (!qrDataUrl) { toast.error('Image is still rendering…'); return }
    setGenerating(true)
    try {
      // Convert the data URL to a Blob so we can write it to the clipboard as
      // image/png. navigator.clipboard.write requires real ClipboardItem
      // support (Chrome/Edge/Safari 13+); older browsers fall back to a toast
      // telling the user to download instead.
      const blob = await (await fetch(qrDataUrl)).blob()
      const item = new ClipboardItem({ 'image/png': blob })
      await navigator.clipboard.write([item])
      toast.success('QR image copied to clipboard — paste into your editor')
    } catch {
      toast.error('Clipboard image copy not supported on this browser. Try Download → PNG instead.')
    } finally {
      setGenerating(false)
    }
  }

  const socials = [
    {
      label: 'Twitter / X',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      label: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: 'LinkedIn',
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-brand-muted text-brand">
            <Share2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Share this QR code</DialogTitle>
          <DialogDescription className="text-center">
            Copy the link, embed it on a page, or share it to your favorite social network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Copy short URL / payload */}
          <div className="space-y-1.5">
            <Label htmlFor="share-link" className="text-xs font-medium text-muted-foreground">
              {isDynamic ? 'Short URL' : 'QR payload'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="share-link"
                readOnly
                value={shortUrl}
                className="text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                variant={copiedKind === 'link' ? 'outline' : 'default'}
                onClick={copyLink}
                className={cn('shrink-0', copiedKind !== 'link' && 'bg-brand text-brand-foreground hover:bg-brand/90')}
              >
                {copiedKind === 'link' ? <><Check className="mr-1.5 h-3.5 w-3.5" /> Copied</> : <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</>}
              </Button>
            </div>
            {isDynamic && (
              <a
                href={shortUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline"
              >
                Open short URL <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <Separator />

          {/* Copy as image */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Copy as image</Label>
            <p className="text-[11px] text-muted-foreground">
              Renders the QR as a PNG and writes it to your clipboard so you can paste it directly into Slack, Gmail, Notion, etc.
            </p>
            <Button
              variant="outline"
              onClick={copyAsImage}
              disabled={generating || !qrDataUrl}
              className="w-full"
            >
              {generating ? (
                <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Rendering…</>
              ) : (
                <><ImageIcon className="mr-2 h-3.5 w-3.5" /> Copy QR as image</>
              )}
            </Button>
          </div>

          <Separator />

          {/* Embed code */}
          <div className="space-y-1.5">
            <Label htmlFor="share-embed" className="text-xs font-medium text-muted-foreground">
              Embed code
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {isDynamic
                ? 'Wraps the QR in a link to your short URL so scanners can click through.'
                : 'A standalone <img> tag pointing at the QR PNG.'}
            </p>
            <div className="flex gap-2">
              <Input
                id="share-embed"
                readOnly
                value={embedCode}
                placeholder="Generating embed…"
                className="text-[11px] font-mono"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                variant={copiedKind === 'embed' ? 'outline' : 'default'}
                onClick={copyEmbed}
                className={cn('shrink-0', copiedKind !== 'embed' && 'bg-brand text-brand-foreground hover:bg-brand/90')}
              >
                {copiedKind === 'embed' ? <><Check className="mr-1.5 h-3.5 w-3.5" /></> : <><Code2 className="mr-1.5 h-3.5 w-3.5" /></>}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Social share */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Share to social</Label>
            <div className="grid grid-cols-4 gap-2">
              {socials.map((s) => {
                const Icon = s.icon
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-center transition-colors hover:bg-accent"
                    title={s.label}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] text-muted-foreground">{s.label.split(' ')[0]}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default ShareDialog
