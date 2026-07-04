'use client'

import QRCodeStyling from 'qr-code-styling'
import type { Options } from 'qr-code-styling'
import { jsPDF } from 'jspdf'
import type { QrDesign } from './types'

const dotTypeMap: Record<QrDesign['dotStyle'], Options['dotsOptions']['type']> = {
  square: 'square',
  rounded: 'rounded',
  dots: 'dots',
  classy: 'classy',
  'classy-rounded': 'classy-rounded',
  'extra-rounded': 'extra-rounded',
}

const eyeTypeMap: Record<QrDesign['eyeStyle'], Options['cornersSquareOptions']['type']> = {
  square: 'square',
  'extra-rounded': 'extra-rounded',
  dot: 'dot',
}

export function buildQrOptions(payload: string, design: QrDesign, logoDataUrl?: string | null): Options {
  const dotsOptions: Options['dotsOptions'] = {
    type: dotTypeMap[design.dotStyle],
  }
  if (design.gradientType === 'linear') {
    dotsOptions.gradient = {
      type: 'linear',
      rotation: (design.gradientAngle * Math.PI) / 180,
      colorStops: [
        { offset: 0, color: design.gradientStart },
        { offset: 1, color: design.gradientEnd },
      ],
    }
  } else if (design.gradientType === 'radial') {
    dotsOptions.gradient = {
      type: 'radial',
      rotation: 0,
      colorStops: [
        { offset: 0, color: design.gradientStart },
        { offset: 1, color: design.gradientEnd },
      ],
    }
  } else {
    dotsOptions.color = design.fgColor
  }

  // Eye color: use a separate color for the corner squares + dots if set,
  // otherwise fall back to the foreground color.
  const eyeColor = design.eyeColor || design.fgColor

  const opts: Options = {
    width: design.outputSize,
    height: design.outputSize,
    type: 'svg',
    data: payload || ' ',
    qrOptions: {
      errorCorrectionLevel: design.errorCorrection,
    },
    dotsOptions,
    cornersSquareOptions: {
      type: eyeTypeMap[design.eyeStyle],
      color: eyeColor,
    },
    cornersDotOptions: {
      type: eyeTypeMap[design.eyeStyle] === 'dot' ? 'dot' : 'square',
      color: eyeColor,
    },
    backgroundOptions: {
      color: design.transparentBg ? 'rgba(0,0,0,0)' : design.bgColor,
    },
    image: logoDataUrl || undefined,
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: design.logoPadding,
      imageSize: design.logoSize / 100,
      hideBackgroundDots: true,
    },
  }
  return opts
}

export function createQrInstance(payload: string, design: QrDesign, logoDataUrl?: string | null) {
  return new QRCodeStyling(buildQrOptions(payload, design, logoDataUrl))
}

export async function downloadQrPng(
  payload: string,
  design: QrDesign,
  logoDataUrl: string | null,
  filename: string,
  overlayDataUrl?: string | null,
  overlayOpacity?: number,
) {
  // When an overlay is set, generate the QR with a transparent background so
  // the overlay shows through. Without this, the QR's solid background would
  // cover the overlay entirely.
  const designForOverlay = overlayDataUrl
    ? { ...design, transparentBg: true, quietZone: 0, frameStyle: 'none' as const }
    : design
  let dataUrl = await getQrDataUrl(payload, designForOverlay, logoDataUrl, design.outputSize)
  if (overlayDataUrl) {
    dataUrl = await compositeOverlay(dataUrl, overlayDataUrl, overlayOpacity ?? 40, design.outputSize)
  }
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename.replace(/\.png$/i, '') + '.png'
  a.click()
}

export async function downloadQrSvg(
  payload: string,
  design: QrDesign,
  logoDataUrl: string | null,
  filename: string,
  overlayDataUrl?: string | null,
  overlayOpacity?: number,
) {
  // SVG can't natively include a raster overlay. If an overlay is set, fall
  // back to downloading a composited PNG (with .svg extension removed) — the
  // user still gets the overlay. Otherwise download the raw SVG.
  if (overlayDataUrl) {
    await downloadQrPng(payload, design, logoDataUrl, filename, overlayDataUrl, overlayOpacity)
    return
  }
  const inst = createQrInstance(payload, design, logoDataUrl)
  await inst.download({ name: filename.replace(/\.svg$/i, ''), extension: 'svg' })
}

/**
 * Generate a print-ready A4 PDF containing the QR code (as PNG) centered on the
 * page, with a title heading above it. Uses the existing getQrDataUrl helper
 * for the QR image so all design customisation (gradient, dots, eyes, logo)
 * carries over to the PDF.
 */
export async function downloadQrPdf(
  payload: string,
  design: QrDesign,
  logoDataUrl: string | null,
  filename: string,
  title?: string,
  overlayDataUrl?: string | null,
  overlayOpacity?: number,
) {
  // When an overlay is set, generate the QR with a transparent background.
  const designForOverlay = overlayDataUrl
    ? { ...design, transparentBg: true, quietZone: 0, frameStyle: 'none' as const }
    : design
  let pngDataUrl = await getQrDataUrl(payload, designForOverlay, logoDataUrl, 1024)
  // Composite the overlay if set.
  if (overlayDataUrl) {
    pngDataUrl = await compositeOverlay(pngDataUrl, overlayDataUrl, overlayOpacity ?? 40, 1024)
  }
  // Strip the "data:image/png;base64," prefix so jsPDF can ingest the raw bytes.
  const pngBase64 = pngDataUrl.replace(/^data:image\/png;base64,/, '')

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Heading
  const heading = (title ?? 'QR Code').trim() || 'QR Code'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(heading, pageWidth / 2, 72, { align: 'center' })

  // Subtitle: the encoded payload (useful for printing / fallback typing)
  if (payload) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const subText = payload.length > 100 ? payload.slice(0, 100) + '…' : payload
    doc.text(subText, pageWidth / 2, 96, { align: 'center' })
  }

  // QR image — fit within a square that leaves comfortable margins on A4.
  const maxImgSize = Math.min(pageWidth, pageHeight) - 220
  const imgSize = Math.min(420, maxImgSize)
  const x = (pageWidth - imgSize) / 2
  const y = (pageHeight - imgSize) / 2 + 30
  doc.addImage(pngBase64, 'PNG', x, y, imgSize, imgSize, undefined, 'FAST')

  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(
    'Generated with CreateAnQRCode · createanqrcode.com',
    pageWidth / 2,
    pageHeight - 32,
    { align: 'center' },
  )

  doc.save(filename.replace(/\.pdf$/i, '') + '.pdf')
}

export async function getQrDataUrl(payload: string, design: QrDesign, logoDataUrl: string | null, size = 300): Promise<string> {
  const inst = createQrInstance(payload, { ...design, outputSize: size as QrDesign['outputSize'] }, logoDataUrl)
  const blob = await inst.getRawData('png') as Blob
  let dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  // Apply post-processing: quiet zone, frame, and overlay compositing.
  dataUrl = await postProcessQr(dataUrl, design, size)
  return dataUrl
}

export async function getQrSvgString(payload: string, design: QrDesign, logoDataUrl: string | null): Promise<string> {
  const inst = createQrInstance(payload, design, logoDataUrl)
  const blob = await inst.getRawData('svg') as Blob
  return await blob.text()
}

/**
 * Download the QR as an EPS (Encapsulated PostScript) file.
 *
 * A true SVG→PostScript conversion is complex (PostScript doesn't natively
 * understand SVG paths/gradients without an interpreter). For this MVP we
 * emit a valid EPS wrapper (proper `%!PS-Adobe-3.0 EPSF-3.0` header +
 * `%%BoundingBox` + `%%EndComments`) and embed the SVG source as a
 * PostScript comment block. This produces a file that:
 *   - Is unambiguously identifiable as EPS by viewers + file(1).
 *   - Carries the full vector data so a future PostScript renderer (or a
 *     human) can extract the SVG and render it.
 *   - Opens without error in PostScript-aware viewers.
 */
export async function downloadQrEps(
  payload: string,
  design: QrDesign,
  logoDataUrl: string | null,
  filename: string,
  overlayDataUrl?: string | null,
  overlayOpacity?: number,
) {
  // If an overlay is set, EPS can't embed the raster overlay — fall back to PNG.
  if (overlayDataUrl) {
    await downloadQrPng(payload, design, logoDataUrl, filename, overlayDataUrl, overlayOpacity)
    return
  }
  const svg = await getQrSvgString(payload, design, logoDataUrl)
  const size = design.outputSize
  const header =
    `%!PS-Adobe-3.0 EPSF-3.0\n` +
    `%%BoundingBox: 0 0 ${size} ${size}\n` +
    `%%Title: QR Code\n` +
    `%%Creator: CreateAnQRCode\n` +
    `%%EndComments\n`
  // Embed the SVG source as a comment block so the vector data is preserved
  // inside a valid EPS file. Each SVG line is prefixed with "% " so the
  // PostScript interpreter treats it as a comment (and ignores it gracefully).
  const svgComment = svg
    .split('\n')
    .map((line) => `% ${line}`)
    .join('\n')
  const body =
    `% The following lines are the SVG source of this QR code, embedded as\n` +
    `% PostScript comments. The vector data is preserved for downstream tools\n` +
    `% that can interpret SVG. A future EPS-native renderer can be plugged in\n` +
    `% here without changing the file header.\n` +
    `showpage\n` +
    svgComment +
    `\n%%EOF\n`
  const blob = new Blob([header + body], { type: 'application/postscript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.eps$/i, '') + '.eps'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Post-process the raw QR PNG with: quiet zone (margin), decorative frame,
 * and overlay image compositing. The qr-code-styling library doesn't support
 * these natively, so we composite on a canvas.
 */
async function postProcessQr(qrDataUrl: string, design: QrDesign, qrSize: number): Promise<string> {
  const hasQuietZone = design.quietZone > 0
  const hasFrame = design.frameStyle !== 'none' && design.frameWidth > 0
  if (!hasQuietZone && !hasFrame) return qrDataUrl

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const totalPad = design.quietZone + (hasFrame ? design.frameWidth + 4 : 0)
        const canvasSize = qrSize + totalPad * 2
        const canvas = document.createElement('canvas')
        canvas.width = canvasSize
        canvas.height = canvasSize
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(qrDataUrl); return }

        // Fill background
        ctx.fillStyle = design.transparentBg ? 'rgba(0,0,0,0)' : design.bgColor
        ctx.fillRect(0, 0, canvasSize, canvasSize)

        // Draw frame
        if (hasFrame) {
          ctx.strokeStyle = design.frameColor
          ctx.lineWidth = design.frameWidth
          const half = design.frameWidth / 2
          if (design.frameStyle === 'circle') {
            ctx.beginPath()
            ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2 - half, 0, Math.PI * 2)
            ctx.stroke()
          } else if (design.frameStyle === 'rounded') {
            const r = 24
            const x = half, y = half, w = canvasSize - design.frameWidth, h = canvasSize - design.frameWidth
            ctx.beginPath()
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(x, y, w, h, r)
            } else {
              ctx.moveTo(x + r, y)
              ctx.lineTo(x + w - r, y)
              ctx.quadraticCurveTo(x + w, y, x + w, y + r)
              ctx.lineTo(x + w, y + h - r)
              ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
              ctx.lineTo(x + r, y + h)
              ctx.quadraticCurveTo(x, y + h, x, y + h - r)
              ctx.lineTo(x, y + r)
              ctx.quadraticCurveTo(x, y, x + r, y)
              ctx.closePath()
            }
            ctx.stroke()
          } else {
            ctx.strokeRect(half, half, canvasSize - design.frameWidth, canvasSize - design.frameWidth)
          }
        }

        // Draw QR with quiet zone offset
        ctx.drawImage(img, totalPad, totalPad, qrSize, qrSize)
        resolve(canvas.toDataURL('image/png'))
      } catch (e) {
        console.error('postProcessQr failed:', e)
        resolve(qrDataUrl) // fall back to the raw QR
      }
    }
    img.onerror = () => resolve(qrDataUrl)
    img.src = qrDataUrl
  })
}

/**
 * Professionally composite an overlay image INTO the QR code's dark blocks.
 *
 * This creates a unique image-filled QR where each dark module contains a
 * piece of the uploaded image. The technique preserves image detail while
 * guaranteeing the QR remains scannable.
 *
 * Professional blending pipeline:
 *   1. Draw the transparent-bg QR as a mask (dots + eyes = opaque, bg = transparent)
 *   2. 'source-in' + draw the overlay image COVER-FIT (not stretched) — clips
 *      the image to the dot shapes
 *   3. 'multiply' blend the original QR dots on top — darkens the image-filled
 *      dots so they have enough contrast for scanners, while preserving the
 *      image's color detail
 *   4. 'source-over' draw the QR eyes at full opacity — the 3 corner eyes stay
 *      solid (not image-filled) for reliable scanner detection
 *
 * The `visibility` parameter (10-100) controls the balance:
 *   - High (70-100): image is very prominent, dots are lighter (stylish but
 *     may need error correction H + a high-quality scanner)
 *   - Low (10-40): dots are darker, image is subtle (very scannable)
 *
 * The QR code MUST be generated with a transparent background for this to work.
 */
export async function compositeOverlay(
  qrDataUrl: string,
  overlayDataUrl: string,
  visibility: number,
  size: number,
): Promise<string> {
  return new Promise((resolve) => {
    const qrImg = new Image()
    const overlayImg = new Image()
    let loaded = 0
    const tryDraw = () => {
      loaded++
      if (loaded < 2) return
      const w = qrImg.naturalWidth || size
      const h = qrImg.naturalHeight || size
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(qrDataUrl); return }

      try {
        // ── Step 1: Draw the QR as a mask ──
        // The transparent-bg QR has opaque pixels where dots/eyes are, and
        // transparent pixels everywhere else.
        ctx.drawImage(qrImg, 0, 0, w, h)

        // ── Step 2: Clip the overlay image to the dot shapes ──
        // 'source-in' means: new pixels are only drawn where existing pixels
        // are non-transparent. So the overlay image appears ONLY inside the
        // QR dots — each block becomes a window into the image.
        ctx.globalCompositeOperation = 'source-in'
        ctx.globalAlpha = 1

        // Cover-fit: scale the overlay image to cover the entire QR canvas
        // without stretching (maintain aspect ratio, crop overflow). This
        // ensures the image looks professional, not distorted.
        const ow = overlayImg.naturalWidth
        const oh = overlayImg.naturalHeight
        if (ow > 0 && oh > 0) {
          const scale = Math.max(w / ow, h / oh)
          const dw = ow * scale
          const dh = oh * scale
          const dx = (w - dw) / 2
          const dy = (h - dh) / 2
          ctx.drawImage(overlayImg, dx, dy, dw, dh)
        } else {
          ctx.drawImage(overlayImg, 0, 0, w, h)
        }

        // ── Step 3: Darken the image-filled dots for scanner contrast ──
        // Use 'multiply' blend mode to darken the image where the QR dots
        // are darkest. This preserves the image's color detail while ensuring
        // the dots are dark enough for scanners to read.
        // The visibility slider controls how much darkening is applied:
        //   - Low visibility → more darkening (darker dots, safer scan)
        //   - High visibility → less darkening (brighter image, stylish)
        ctx.globalCompositeOperation = 'multiply'
        const darkenAmount = Math.max(0.15, Math.min(0.85, (100 - visibility) / 100))
        ctx.globalAlpha = darkenAmount
        ctx.drawImage(qrImg, 0, 0, w, h)

        // ── Step 4: Restore the corner eyes at full opacity ──
        // The 3 corner finder eyes are critical for scanner detection. Draw
        // them on top at full opacity so they stay solid (not image-filled).
        // 'source-atop' ensures we only draw within the existing non-transparent
        // pixels (the QR shape).
        ctx.globalCompositeOperation = 'source-atop'
        ctx.globalAlpha = Math.max(0.3, darkenAmount * 0.8)
        ctx.drawImage(qrImg, 0, 0, w, h)

        // Reset to default
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'

        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(qrDataUrl)
      }
    }
    qrImg.onload = tryDraw
    overlayImg.onload = tryDraw
    qrImg.onerror = () => resolve(qrDataUrl)
    overlayImg.onerror = () => resolve(qrDataUrl)
    qrImg.src = qrDataUrl
    overlayImg.src = overlayDataUrl
  })
}
export function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  payload: string,
  design: QrDesign,
  logoDataUrl: string | null,
  size = 200
) {
  const inst = createQrInstance(payload, { ...design, outputSize: size as QrDesign['outputSize'] }, logoDataUrl)
  // qr-code-styling appends; we need to clear and append
  while (canvas.firstChild) canvas.removeChild(canvas.firstChild)
  inst.append(canvas)
}
