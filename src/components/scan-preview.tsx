'use client'

import { useState } from 'react'
import { Smartphone, RefreshCw, Check, Globe, Wifi, IndianRupee, Contact, Phone, Mail, MessageSquare, MapPin, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QrCodeRecord } from '@/lib/types'
import { QR_TYPE_MAP } from '@/lib/qr-types'

interface Props {
  code: QrCodeRecord
}

/**
 * Phone mockup that simulates what a user sees when they scan the QR code.
 * Shows the destination content in a realistic mobile frame.
 */
export function ScanPreview({ code }: Props) {
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(true)

  const handleRescan = () => {
    setScanning(true)
    setScanned(false)
    setTimeout(() => {
      setScanning(false)
      setScanned(true)
    }, 1200)
  }

  const payload = code.staticPayload || code.destinationUrl || ''
  const typeDef = QR_TYPE_MAP[code.qrType]

  // Render the destination content based on QR type
  const renderContent = () => {
    if (!payload) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Globe className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No destination set</p>
        </div>
      )
    }

    // Dynamic QR — show redirect screen
    if (code.isDynamic) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2.5">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs text-muted-foreground">Redirecting to...</span>
          </div>
          <DestinationPreview url={payload} />
          {code.passwordHash && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
              <span className="grid h-5 w-5 place-items-center rounded-full border border-border">🔒</span>
              Password protected
            </div>
          )}
        </div>
      )
    }

    // Static QR — type-specific preview
    switch (code.qrType) {
      case 'url':
      case 'pdf':
      case 'googlemaps':
      case 'youtube':
        return <DestinationPreview url={payload} />
      case 'wifi':
        return <WifiPreview payload={payload} />
      case 'upi':
        return <UpiPreview payload={payload} />
      case 'vcard':
        return <VCardPreview payload={payload} />
      case 'phone':
        return <SimpleActionPreview icon={Phone} title="Call Number" value={payload.replace('tel:', '')} action="Call" />
      case 'email':
        return <EmailPreview payload={payload} />
      case 'sms':
        return <SmsPreview payload={payload} />
      case 'whatsapp':
      case 'whatsapp_business':
        return <WhatsAppPreview payload={payload} />
      case 'location':
        return <SimpleActionPreview icon={MapPin} title="Open Location" value={payload.replace('geo:', '')} action="Open Maps" />
      case 'text':
        return <TextPreview payload={payload} />
      default:
        // Social media types (instagram, facebook, twitter, linkedin, spotify)
        if (typeDef) {
          return <DestinationPreview url={payload} />
        }
        return <DestinationPreview url={payload} />
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phone frame */}
      <div className="relative w-[260px]">
        <div className="relative rounded-[2rem] border-[6px] border-neutral-900 bg-neutral-900 shadow-xl dark:border-neutral-800">
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-xl bg-neutral-900 dark:bg-neutral-800" />
          {/* Screen */}
          <div className="relative h-[460px] overflow-hidden rounded-[1.5rem] bg-white dark:bg-neutral-950">
            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <span>●●●</span>
                <span>100%</span>
              </div>
            </div>

            {/* Content area */}
            <div className="flex h-[calc(100%-32px)] flex-col">
              {/* Browser/scan header */}
              <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-900">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate text-[11px] text-muted-foreground">
                  {code.isDynamic ? 'createanqrcode.com/q/...' : 'Scanned content'}
                </span>
                <RefreshCw className="h-3 w-3 text-muted-foreground" />
              </div>

              {/* Scan animation overlay */}
              {scanning && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative h-16 w-16">
                      <div className="absolute inset-0 animate-ping rounded-full border-2 border-neutral-900 dark:border-neutral-100" />
                      <div className="absolute inset-2 rounded-full border-2 border-neutral-900 dark:border-neutral-100" />
                      <div className="absolute inset-4 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                    </div>
                    <p className="text-xs font-medium text-foreground">Scanning...</p>
                  </div>
                </div>
              )}

              {/* Destination content */}
              <div className="flex-1 overflow-y-auto p-4 scroll-thin">
                {scanned && renderContent()}
              </div>

              {/* Bottom indicator */}
              <div className="flex justify-center py-2">
                <div className="h-1 w-24 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rescan button */}
      <Button variant="outline" size="sm" onClick={handleRescan} disabled={scanning} className="btn-press">
        <RefreshCw className={cn('mr-2 h-3.5 w-3.5', scanning && 'animate-spin')} />
        {scanning ? 'Scanning...' : 'Preview scan'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        This is what people see when they scan your QR code
      </p>
    </div>
  )
}

/** URL / website destination preview */
function DestinationPreview({ url }: { url: string }) {
  let displayUrl = url
  let domain = url
  try {
    const u = new URL(url)
    domain = u.hostname
    displayUrl = u.pathname === '/' ? u.hostname : u.hostname + u.pathname
  } catch { /* not a URL */ }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <Globe className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{domain}</p>
          <p className="truncate text-[10px] text-muted-foreground">{displayUrl}</p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-2 h-2 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="mb-1.5 h-2 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="mb-1.5 h-2 w-5/6 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="mb-3 h-2 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex gap-1.5">
          <div className="h-12 flex-1 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-12 flex-1 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
      <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-xs font-medium text-background">
        <ExternalLink className="h-3 w-3" />
        Open Website
      </button>
    </div>
  )
}

/** WiFi preview */
function WifiPreview({ payload }: { payload: string }) {
  const match = payload.match(/WIFI:T:([^;]*);S:([^;]*);P:([^;]*);/)
  const security = match?.[1] || 'WPA2'
  const ssid = match?.[2] || 'Network'
  const password = match?.[3] || ''
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <Wifi className="h-6 w-6 text-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Join WiFi</p>
      </div>
      <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Network</span><span className="font-medium text-foreground">{ssid}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Security</span><span className="font-medium text-foreground">{security === 'nopass' ? 'Open' : security}</span></div>
        {password && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Password</span><span className="font-mono font-medium text-foreground">{password}</span></div>}
      </div>
      <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-xs font-medium text-background">
        <Check className="h-3 w-3" /> Join Network
      </button>
    </div>
  )
}

/** UPI payment preview */
function UpiPreview({ payload }: { payload: string }) {
  const vpa = payload.match(/pa=([^&]*)/)?.[1] || ''
  const name = decodeURIComponent(payload.match(/pn=([^&]*)/)?.[1] || '')
  const amount = payload.match(/am=([^&]*)/)?.[1]
  const note = decodeURIComponent(payload.match(/tn=([^&]*)/)?.[1] || '')
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <IndianRupee className="h-6 w-6 text-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Pay with UPI</p>
      </div>
      <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Pay to</span><span className="font-medium text-foreground">{name || vpa}</span></div>
        {vpa && <div className="flex justify-between text-xs"><span className="text-muted-foreground">UPI ID</span><span className="font-mono text-[10px] text-foreground">{vpa}</span></div>}
        {amount && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Amount</span><span className="text-base font-bold text-foreground">₹{amount}</span></div>}
        {note && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Note</span><span className="text-foreground">{note}</span></div>}
      </div>
      <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-xs font-medium text-background">
        Pay ₹{amount || '—'}
      </button>
      <p className="text-center text-[10px] text-muted-foreground">Works with PhonePe, GPay, Paytm, BHIM</p>
    </div>
  )
}

/** vCard / contact preview */
function VCardPreview({ payload }: { payload: string }) {
  const name = payload.match(/FN:([^\n]*)/)?.[1] || 'Contact'
  const phone = payload.match(/TEL[^:]*:([^\n]*)/)?.[1]
  const email = payload.match(/EMAIL[^:]*:([^\n]*)/)?.[1]
  const company = payload.match(/ORG:([^\n]*)/)?.[1]
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="grid h-14 w-14 place-items-center rounded-full border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <Contact className="h-6 w-6 text-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">{name}</p>
        {company && <p className="text-xs text-muted-foreground">{company}</p>}
      </div>
      <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        {phone && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Phone</span><span className="font-medium text-foreground">{phone}</span></div>}
        {email && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Email</span><span className="truncate font-medium text-foreground">{email}</span></div>}
      </div>
      <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-xs font-medium text-background">
        <Check className="h-3 w-3" /> Save Contact
      </button>
    </div>
  )
}

/** Email preview */
function EmailPreview({ payload }: { payload: string }) {
  const to = payload.match(/mailto:([^?]*)/)?.[1] || ''
  const subject = decodeURIComponent(payload.match(/subject=([^&]*)/)?.[1] || '')
  const body = decodeURIComponent(payload.match(/body=([^&]*)/)?.[1] || '')
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <Mail className="h-6 w-6 text-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Send Email</p>
      </div>
      <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">To</span><span className="truncate font-medium text-foreground">{to}</span></div>
        {subject && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subject</span><span className="text-foreground">{subject}</span></div>}
        {body && <div className="rounded bg-neutral-50 p-2 text-xs text-muted-foreground dark:bg-neutral-900">{body}</div>}
      </div>
      <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-xs font-medium text-background">
        <Mail className="h-3 w-3" /> Compose Email
      </button>
    </div>
  )
}

/** SMS preview */
function SmsPreview({ payload }: { payload: string }) {
  const number = payload.match(/sms:([^?]*)/)?.[1] || ''
  const body = decodeURIComponent(payload.match(/body=([^&]*)/)?.[1] || '')
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <MessageSquare className="h-6 w-6 text-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Send SMS</p>
      </div>
      <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">To</span><span className="font-medium text-foreground">{number}</span></div>
        {body && <div className="rounded bg-neutral-50 p-2 text-xs text-muted-foreground dark:bg-neutral-900">{body}</div>}
      </div>
      <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-xs font-medium text-background">
        <MessageSquare className="h-3 w-3" /> Send Message
      </button>
    </div>
  )
}

/** WhatsApp preview */
function WhatsAppPreview({ payload }: { payload: string }) {
  const number = payload.match(/wa\.me\/([^?]*)/)?.[1] || ''
  const text = decodeURIComponent(payload.match(/text=([^&]*)/)?.[1] || '')
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <MessageSquare className="h-6 w-6 text-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Open WhatsApp</p>
      </div>
      <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Chat with</span><span className="font-medium text-foreground">+{number}</span></div>
        {text && <div className="rounded bg-neutral-50 p-2 text-xs text-muted-foreground dark:bg-neutral-900">{text}</div>}
      </div>
      <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-xs font-medium text-background">
        <MessageSquare className="h-3 w-3" /> Open Chat
      </button>
    </div>
  )
}

/** Simple action preview (phone, location) */
function SimpleActionPreview({ icon: Icon, title, value, action }: { icon: typeof Phone; title: string; value: string; action: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <Icon className="h-6 w-6 text-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="rounded-lg border border-neutral-200 p-3 text-center dark:border-neutral-800">
        <p className="font-mono text-sm text-foreground">{value}</p>
      </div>
      <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-xs font-medium text-background">
        {action}
      </button>
    </div>
  )
}

/** Plain text preview */
function TextPreview({ payload }: { payload: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
          <span className="font-mono text-sm font-bold text-foreground">T</span>
        </div>
        <p className="text-sm font-semibold text-foreground">Text Content</p>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-foreground dark:border-neutral-800 dark:bg-neutral-900">
        {payload.slice(0, 200)}{payload.length > 200 && '...'}
      </div>
    </div>
  )
}

// Suppress unused import warning
void Smartphone
