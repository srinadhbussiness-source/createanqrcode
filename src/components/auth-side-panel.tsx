'use client'

import { QrCode as QrCodeIcon, Check, Zap, ShieldCheck, BarChart3, Star } from 'lucide-react'
import { useRouterStore } from '@/lib/stores'

const FEATURES = [
  { icon: Zap, title: '83+ QR types', desc: 'URL, WiFi, vCard, UPI, crypto, social & more' },
  { icon: ShieldCheck, title: 'No watermark', desc: 'Clean downloads — PNG & SVG, free forever' },
  { icon: BarChart3, title: 'Scan analytics', desc: 'Track every scan with geo, device & time data' },
  { icon: Check, title: 'Dynamic QR codes', desc: 'Edit destinations anytime without reprinting' },
]

const STATS = [
  { value: '2.4M+', label: 'QR codes created' },
  { value: '180+', label: 'countries' },
  { value: '99.9%', label: 'uptime' },
]

/**
 * Clean, professional LHS panel for auth pages (login/signup).
 * Pure monochrome — dark panel in light mode, light panel in dark mode.
 * Logo is always visible (explicit colors, not bg-current).
 */
export function AuthSidePanel() {
  const navigate = useRouterStore((s) => s.navigate)

  return (
    <div className="inverted relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16">
      <div className="absolute inset-0 dot-grid opacity-[0.04]" />

      {/* Top — brand + headline */}
      <div className="relative">
        <button
          onClick={() => navigate('home')}
          className="flex items-center gap-2.5 font-bold text-lg"
        >
          {/* Explicit logo — always visible, no bg-current ambiguity */}
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-background text-foreground">
            <QrCodeIcon className="h-5 w-5" />
          </span>
          <span>CreateAnQRCode</span>
        </button>

        <div className="mt-16 max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            Create stunning<br />QR codes in seconds.
          </h2>
          <p className="mt-4 text-base opacity-70 xl:text-lg">
            83+ QR types, full design control, dynamic links with scan analytics.
            Free forever, no watermark, no sign-up required.
          </p>
        </div>
      </div>

      {/* Middle — features */}
      <div className="relative space-y-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-current/15">
              <f.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-xs opacity-60">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom — stats */}
      <div className="relative">
        <div className="flex gap-8 border-t border-current/10 pt-6">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs opacity-60">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-1 text-xs opacity-50">
          <Star className="h-3 w-3 fill-current" />
          <Star className="h-3 w-3 fill-current" />
          <Star className="h-3 w-3 fill-current" />
          <Star className="h-3 w-3 fill-current" />
          <Star className="h-3 w-3 fill-current" />
          <span className="ml-1">4.9/5 from 12,000+ users</span>
        </div>
      </div>
    </div>
  )
}
