'use client'

import { useEffect, useState } from 'react'
import { getQrDataUrl, compositeOverlay } from '@/lib/qr-generate'
import type { QrDesign } from '@/lib/types'

interface Props {
  payload: string
  design: QrDesign
  logoDataUrl?: string | null
  overlayDataUrl?: string | null
  overlayOpacity?: number
  size?: number
  className?: string
}

export function QrPreview({ payload, design, logoDataUrl, overlayDataUrl, overlayOpacity = 50, size = 240, className }: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)

  // Generate the QR as a PNG (which goes through postProcessQr → quiet zone +
  // frame are applied), then optionally composite the overlay on top.
  //
  // KEY: when an overlay is active, we force the QR's background to be
  // transparent — otherwise the QR's solid background would completely cover
  // the overlay and the user wouldn't see it. With a transparent background,
  // the QR's colored dots/eyes show on top of the overlay image.
  useEffect(() => {
    let cancelled = false
    // When an overlay is set, generate the QR with a transparent background
    // so the overlay shows through the QR's background area.
    const designForOverlay = overlayDataUrl
      ? { ...design, transparentBg: true, quietZone: 0, frameStyle: 'none' as const }
      : design

    getQrDataUrl(payload || ' ', designForOverlay, logoDataUrl, size)
      .then(async (qrPng) => {
        if (cancelled) return
        if (overlayDataUrl) {
          const composited = await compositeOverlay(qrPng, overlayDataUrl, overlayOpacity, size)
          if (!cancelled) {
            queueMicrotask(() => { if (!cancelled) setImgUrl(composited) })
          }
        } else {
          queueMicrotask(() => { if (!cancelled) setImgUrl(qrPng) })
        }
      })
      .catch((e) => {
        console.error('QR preview generation failed:', e)
      })
    return () => { cancelled = true }
  }, [payload, design, logoDataUrl, overlayDataUrl, overlayOpacity, size])

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        width={size}
        height={size}
        alt="QR code preview"
        className={className}
        style={{ imageRendering: 'pixelated', maxWidth: '100%', height: 'auto' }}
      />
    )
  }

  // Fallback while generating (first render)
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f4f5',
        borderRadius: 8,
      }}
      aria-label="Generating QR code…"
    >
      <span className="text-xs text-muted-foreground animate-pulse">Generating…</span>
    </div>
  )
}
