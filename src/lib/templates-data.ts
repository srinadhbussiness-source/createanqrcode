import type { QrDesign } from './types'

export interface SystemTemplate {
  id: string
  name: string
  category: 'business' | 'events' | 'marketing' | 'education' | 'india'
  isPro: boolean
  design: QrDesign
}

const base: QrDesign = {
  fgColor: '#000000', bgColor: '#FFFFFF', transparentBg: false,
  dotStyle: 'square', eyeStyle: 'square', errorCorrection: 'M',
  outputSize: 512, gradientType: 'none',
  gradientStart: '#000000', gradientEnd: '#52525B', gradientAngle: 45,
  logoSize: 20, logoPadding: 5,
}

// Monochrome template palette — variety through dot/eye styles + neutral gradients,
// never through hue (per pure B/W monochrome aesthetic).
export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  // Business (4)
  { id: 'restaurant-menu', name: 'Restaurant Menu', category: 'business', isPro: false,
    design: { ...base, fgColor: '#1C1917', dotStyle: 'rounded', eyeStyle: 'extra-rounded', errorCorrection: 'Q' } },
  { id: 'corporate-pro', name: 'Corporate Professional', category: 'business', isPro: false,
    design: { ...base, fgColor: '#0A0A0A', dotStyle: 'classy', eyeStyle: 'square', errorCorrection: 'Q' } },
  { id: 'product-scan', name: 'Product Scan', category: 'business', isPro: false,
    design: { ...base, fgColor: '#18181B', dotStyle: 'extra-rounded', eyeStyle: 'extra-rounded', errorCorrection: 'Q' } },
  { id: 'store-locator', name: 'Store Locator', category: 'business', isPro: true,
    design: { ...base, fgColor: '#27272A', dotStyle: 'dots', eyeStyle: 'dot', errorCorrection: 'H' } },

  // Events (4)
  { id: 'wedding-elegant', name: 'Wedding Elegant', category: 'events', isPro: false,
    design: { ...base, fgColor: '#3F3F46', dotStyle: 'classy-rounded', eyeStyle: 'extra-rounded', gradientType: 'linear', gradientStart: '#3F3F46', gradientEnd: '#18181B', gradientAngle: 90, errorCorrection: 'Q' } },
  { id: 'concert-vibrant', name: 'Concert Vibrant', category: 'events', isPro: false,
    design: { ...base, fgColor: '#000000', dotStyle: 'dots', eyeStyle: 'dot', gradientType: 'linear', gradientStart: '#000000', gradientEnd: '#52525B', gradientAngle: 45, errorCorrection: 'H' } },
  { id: 'conference-tech', name: 'Conference Tech', category: 'events', isPro: false,
    design: { ...base, fgColor: '#18181B', dotStyle: 'rounded', eyeStyle: 'extra-rounded', gradientType: 'linear', gradientStart: '#27272A', gradientEnd: '#000000', gradientAngle: 135 } },
  { id: 'birthday-fun', name: 'Birthday Fun', category: 'events', isPro: true,
    design: { ...base, fgColor: '#52525B', dotStyle: 'dots', eyeStyle: 'dot', gradientType: 'radial', gradientStart: '#71717A', gradientEnd: '#27272A', errorCorrection: 'H' } },

  // Marketing (4)
  { id: 'promo-bold', name: 'Promo Bold', category: 'marketing', isPro: false,
    design: { ...base, fgColor: '#000000', dotStyle: 'extra-rounded', eyeStyle: 'extra-rounded', errorCorrection: 'Q' } },
  { id: 'social-gradient', name: 'Social Gradient', category: 'marketing', isPro: false,
    design: { ...base, fgColor: '#18181B', dotStyle: 'rounded', eyeStyle: 'dot', gradientType: 'linear', gradientStart: '#000000', gradientEnd: '#71717A', gradientAngle: 45, errorCorrection: 'H' } },
  { id: 'app-download', name: 'App Download', category: 'marketing', isPro: false,
    design: { ...base, fgColor: '#0A0A0A', dotStyle: 'classy', eyeStyle: 'square', gradientType: 'linear', gradientStart: '#27272A', gradientEnd: '#000000', gradientAngle: 135 } },
  { id: 'review-grow', name: 'Review Grow', category: 'marketing', isPro: true,
    design: { ...base, fgColor: '#3F3F46', dotStyle: 'dots', eyeStyle: 'extra-rounded', gradientType: 'radial', gradientStart: '#52525B', gradientEnd: '#18181B', errorCorrection: 'H' } },

  // Education (4)
  { id: 'course-modern', name: 'Course Modern', category: 'education', isPro: false,
    design: { ...base, fgColor: '#18181B', dotStyle: 'rounded', eyeStyle: 'extra-rounded', gradientType: 'linear', gradientStart: '#27272A', gradientEnd: '#000000', gradientAngle: 90 } },
  { id: 'student-id', name: 'Student ID', category: 'education', isPro: false,
    design: { ...base, fgColor: '#000000', dotStyle: 'square', eyeStyle: 'square', errorCorrection: 'Q' } },
  { id: 'library-classic', name: 'Library Classic', category: 'education', isPro: false,
    design: { ...base, fgColor: '#1C1917', dotStyle: 'classy', eyeStyle: 'square', errorCorrection: 'Q' } },
  { id: 'campus-vibrant', name: 'Campus Vibrant', category: 'education', isPro: true,
    design: { ...base, fgColor: '#27272A', dotStyle: 'extra-rounded', eyeStyle: 'dot', gradientType: 'linear', gradientStart: '#3F3F46', gradientEnd: '#0A0A0A', gradientAngle: 45, errorCorrection: 'H' } },

  // India (4)
  { id: 'upi-saffron', name: 'UPI Standard', category: 'india', isPro: false,
    design: { ...base, fgColor: '#000000', dotStyle: 'rounded', eyeStyle: 'extra-rounded', errorCorrection: 'Q' } },
  { id: 'kirana-store', name: 'Kirana Store', category: 'india', isPro: false,
    design: { ...base, fgColor: '#1C1917', dotStyle: 'classy-rounded', eyeStyle: 'square', errorCorrection: 'Q' } },
  { id: 'festival-fiesta', name: 'Festival Fiesta', category: 'india', isPro: false,
    design: { ...base, fgColor: '#27272A', dotStyle: 'dots', eyeStyle: 'dot', gradientType: 'radial', gradientStart: '#52525B', gradientEnd: '#000000', errorCorrection: 'H' } },
  { id: 'heritage-royal', name: 'Heritage Royal', category: 'india', isPro: true,
    design: { ...base, fgColor: '#1C1917', dotStyle: 'classy', eyeStyle: 'extra-rounded', gradientType: 'linear', gradientStart: '#292524', gradientEnd: '#0C0A09', gradientAngle: 90, errorCorrection: 'H' } },
]
