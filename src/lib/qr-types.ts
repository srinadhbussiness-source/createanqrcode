import {
  Globe, Link2, Link, Smartphone, AppWindow, Download, Contact, User,
  FileText, Mail, Phone, MessageSquare, MessageCircle, Send, PhoneCall,
  Video, Instagram, Facebook, Twitter, Youtube, Linkedin, Music, MapPin,
  MapPinned, CalendarClock, IndianRupee, Wallet, Bitcoin, CreditCard, Wifi,
  QrCode, Type, Hash, AtSign, Users, ShoppingBag, Tag, ThumbsUp, Image as ImageIcon,
  Film, Headphones, Mic2, BookOpen, Newspaper, Megaphone, Calendar, MonitorPlay,
  Building2, Briefcase, PencilLine, NotebookPen, Star, MessageCircleMore,
  Clapperboard, Radio, Camera, ShoppingCart, Gift, PieChart, ListChecks,
  ScanLine, Waypoints, Network, Sparkles, Wand2, type LucideIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────
export type QrCategory =
  | 'links' | 'contact' | 'communication' | 'social' | 'payments'
  | 'wifi' | 'location' | 'events' | 'media' | 'business' | 'info'

export interface QrCategoryDef {
  id: QrCategory
  label: string
  description: string
  icon: LucideIcon
}

export const QR_CATEGORIES: QrCategoryDef[] = [
  { id: 'links', label: 'Links & Web', description: 'Direct people to any web page — sites, apps, deep links and more.', icon: Globe },
  { id: 'contact', label: 'Contact & Personal', description: 'Share who you are — contact cards, resumes and portfolios.', icon: Contact },
  { id: 'communication', label: 'Communication', description: 'Start a conversation — email, call, SMS and messaging apps.', icon: MessageCircle },
  { id: 'social', label: 'Social Media', description: 'Grow every social profile with a single scan.', icon: AtSign },
  { id: 'payments', label: 'Payments', description: 'Accept payments instantly — UPI, PayPal, crypto and more.', icon: IndianRupee },
  { id: 'wifi', label: 'WiFi & Network', description: 'Let guests join your network without typing a password.', icon: Wifi },
  { id: 'location', label: 'Location & Maps', description: 'Send people straight to a place on the map.', icon: MapPin },
  { id: 'events', label: 'Events & Meetings', description: 'Fill calendars and join video calls in one tap.', icon: CalendarClock },
  { id: 'media', label: 'Content & Media', description: 'Share music, video, PDFs and files instantly.', icon: Music },
  { id: 'business', label: 'Business & Marketing', description: 'Coupons, reviews, menus, surveys — drive real outcomes.', icon: Megaphone },
  { id: 'info', label: 'Info & Text', description: 'Plain text and notes — the simplest way to share words.', icon: Type },
]

// ─────────────────────────────────────────────────────────────────────────────
// Field & type definitions
// ─────────────────────────────────────────────────────────────────────────────
export interface QrTypeField {
  key: string
  label: string
  type: 'text' | 'tel' | 'email' | 'url' | 'password' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'checkbox'
  required?: boolean
  placeholder?: string
  helper?: string
  options?: { label: string; value: string }[]
  defaultValue?: string | boolean
  showIf?: (vals: Record<string, string | boolean>) => boolean
}

export interface QrFaq {
  q: string
  a: string
}

export interface QrTypeDef {
  id: string
  label: string
  category: QrCategory
  icon: LucideIcon
  description: string
  useCase: string
  fields: QrTypeField[]
  buildPayload: (vals: Record<string, string | boolean>) => string
  // SEO (optional; defaults generated per-category in getSeo)
  seoTitle?: string
  seoDescription?: string
  keywords?: string[]
  howTo?: string[]
  faqs?: QrFaq[]
  popular?: boolean
}

const v = (vals: Record<string, string | boolean>, k: string) => String(vals[k] ?? '')

// Helper: simple URL-wrapper type (social / link profiles)
function urlType(opts: {
  id: string; label: string; category: QrCategory; icon: LucideIcon
  description: string; useCase: string
  fieldKey: string; fieldLabel: string; fieldPlaceholder: string
  build: (val: string) => string
  popular?: boolean
}): QrTypeDef {
  return {
    id: opts.id, label: opts.label, category: opts.category, icon: opts.icon,
    description: opts.description, useCase: opts.useCase, popular: opts.popular,
    fields: [{ key: opts.fieldKey, label: opts.fieldLabel, type: 'text', required: true, placeholder: opts.fieldPlaceholder }],
    buildPayload: (vals) => opts.build(v(vals, opts.fieldKey).replace(/^\/+/, '').replace('@', '')),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL QR TYPES (80+)
// ─────────────────────────────────────────────────────────────────────────────
export const QR_TYPES: QrTypeDef[] = [
  // ─────────── LINKS & WEB ───────────
  {
    id: 'url', label: 'Website URL', category: 'links', icon: Globe, popular: true,
    description: 'Send scanners to any website. Auto-adds https:// if missing.',
    useCase: 'Website links, product pages, landing pages, blog posts.',
    fields: [{ key: 'url', label: 'Website URL', type: 'url', required: true, placeholder: 'https://example.com' }],
    buildPayload: (vals) => {
      let u = v(vals, 'url').trim()
      if (!u) return ''
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u
      return u
    },
  },
  urlType({ id: 'link-in-bio', category: 'links', icon: Link2, label: 'Link in Bio', popular: true,
    description: 'One link that holds all your links — like Linktree.',
    useCase: 'Instagram/TikTok bios, creator hubs, "all my links" pages.',
    fieldKey: 'url', fieldLabel: 'Link-in-bio page URL', fieldPlaceholder: 'https://my.bio/username',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'app-store', category: 'links', icon: AppWindow, label: 'App Store (iOS)',
    description: 'Links to an app on the Apple App Store.',
    useCase: 'App promotions, packaging, download stickers.',
    fieldKey: 'id', fieldLabel: 'App Store ID', fieldPlaceholder: 'id123456789',
    build: (id) => `https://apps.apple.com/app/id${id}` }),
  urlType({ id: 'google-play', category: 'links', icon: AppWindow, label: 'Google Play',
    description: 'Links to an app on the Google Play Store.',
    useCase: 'Android app promotions and download cards.',
    fieldKey: 'id', fieldLabel: 'Package name or ID', fieldPlaceholder: 'com.example.app',
    build: (id) => `https://play.google.com/store/apps/details?id=${id}` }),
  urlType({ id: 'deep-link', category: 'links', icon: Waypoints, label: 'App Deep Link',
    description: 'Opens a specific screen inside an app via a custom URL scheme.',
    useCase: 'App onboarding, feature deep-links, re-engagement.',
    fieldKey: 'url', fieldLabel: 'Deep link URL', fieldPlaceholder: 'myapp://screen/item/123',
    build: (u) => u }),
  urlType({ id: 'short-link', category: 'links', icon: Link, label: 'Short Link',
    description: 'Encode a short redirect link (e.g. bit.ly, your own domain).',
    useCase: 'Print campaigns, SMS, clean tracking links.',
    fieldKey: 'url', fieldLabel: 'Short URL', fieldPlaceholder: 'https://bit.ly/3abc',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'web-login', category: 'links', icon: ScanLine, label: 'Web Login URL',
    description: 'Send users to a login or onboarding page.',
    useCase: 'Wi-Fi captive portals, kiosk logins, member areas.',
    fieldKey: 'url', fieldLabel: 'Login URL', fieldPlaceholder: 'https://app.example.com/login',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'file', category: 'links', icon: Download, label: 'File Download',
    description: 'Link to any downloadable file (zip, doc, apk, etc.).',
    useCase: 'Software downloads, resource packs, certificates.',
    fieldKey: 'url', fieldLabel: 'File URL', fieldPlaceholder: 'https://example.com/file.zip',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),

  // ─────────── CONTACT & PERSONAL ───────────
  {
    id: 'vcard', label: 'vCard (Contact)', category: 'contact', icon: Contact, popular: true,
    description: 'Saves full contact details straight to the address book.',
    useCase: 'Business cards, conference networking, signage.',
    fields: [
      { key: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'Priya' },
      { key: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Sharma' },
      { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'priya@mycompany.com' },
      { key: 'company', label: 'Company', type: 'text', placeholder: 'My Company Ltd' },
      { key: 'title', label: 'Job Title', type: 'text', placeholder: 'Founder' },
      { key: 'website', label: 'Website', type: 'url', placeholder: 'https://mycompany.com' },
      { key: 'address', label: 'Address', type: 'text', placeholder: '123 MG Road, Bengaluru' },
    ],
    buildPayload: (vals) => {
      const f = v(vals, 'firstName'), l = v(vals, 'lastName')
      const lines = ['BEGIN:VCARD', 'VERSION:4.0', `N:${l};${f};;;`, `FN:${f} ${l}`.trim()]
      if (v(vals, 'phone')) lines.push(`TEL;TYPE=CELL:${v(vals, 'phone')}`)
      if (v(vals, 'email')) lines.push(`EMAIL:${v(vals, 'email')}`)
      if (v(vals, 'company')) lines.push(`ORG:${v(vals, 'company')}`)
      if (v(vals, 'title')) lines.push(`TITLE:${v(vals, 'title')}`)
      if (v(vals, 'website')) lines.push(`URL:${v(vals, 'website')}`)
      if (v(vals, 'address')) lines.push(`ADR:;;${v(vals, 'address')};;;;`)
      lines.push('END:VCARD')
      return lines.join('\n')
    },
  },
  {
    id: 'mecard', label: 'MeCard', category: 'contact', icon: User,
    description: 'Compact Japanese contact format — lighter than vCard.',
    useCase: 'Older devices, simple name+phone sharing.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Priya Sharma' },
      { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'priya@example.com' },
      { key: 'note', label: 'Note', type: 'text', placeholder: 'Met at conference' },
    ],
    buildPayload: (vals) => {
      const esc = (s: string) => s.replace(/([\\;,":])/g, '\\$1')
      const p = `MECARD:N:${esc(v(vals, 'name'))};TEL:${esc(v(vals, 'phone'))};EMAIL:${esc(v(vals, 'email'))};NOTE:${esc(v(vals, 'note'))};;`
      return p
    },
  },
  urlType({ id: 'digital-business-card', category: 'contact', icon: Contact, label: 'Digital Business Card',
    description: 'Link to a hosted digital business card page.',
    useCase: 'Modern networking, paper-free cards.',
    fieldKey: 'url', fieldLabel: 'Card URL', fieldPlaceholder: 'https://card.example.com/priya',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'resume', category: 'contact', icon: FileText, label: 'Resume / CV',
    description: 'Link to an online resume or CV PDF.',
    useCase: 'Job fairs, networking, recruiter scans.',
    fieldKey: 'url', fieldLabel: 'Resume URL', fieldPlaceholder: 'https://example.com/resume.pdf',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'portfolio', category: 'contact', icon: Briefcase, label: 'Portfolio',
    description: 'Link to your portfolio site.',
    useCase: 'Designers, photographers, freelancers.',
    fieldKey: 'url', fieldLabel: 'Portfolio URL', fieldPlaceholder: 'https://myportfolio.com',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'email-signature', category: 'contact', icon: PencilLine, label: 'Email Signature Link',
    description: 'A link to embed in your email signature (booking, vCard, site).',
    useCase: 'Professional email signatures.',
    fieldKey: 'url', fieldLabel: 'Signature link URL', fieldPlaceholder: 'https://cal.com/me',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),

  // ─────────── COMMUNICATION ───────────
  {
    id: 'email', label: 'Email', category: 'communication', icon: Mail,
    description: 'Opens the email app with recipient, subject and body pre-filled.',
    useCase: 'Contact shortcuts, feedback, support links.',
    fields: [
      { key: 'to', label: 'Recipient email', type: 'email', required: true, placeholder: 'addr@example.com' },
      { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Hello' },
      { key: 'body', label: 'Message body', type: 'textarea', placeholder: 'Pre-filled message...' },
    ],
    buildPayload: (vals) => {
      const to = v(vals, 'to'), subject = encodeURIComponent(v(vals, 'subject')), body = encodeURIComponent(v(vals, 'body'))
      let p = `mailto:${to}`
      const q: string[] = []
      if (subject) q.push(`subject=${subject}`)
      if (body) q.push(`body=${body}`)
      if (q.length) p += '?' + q.join('&')
      return p
    },
  },
  {
    id: 'phone', label: 'Phone Call', category: 'communication', icon: Phone,
    description: 'Prompts to call a number on scan.',
    useCase: 'Business cards, storefronts, flyers.',
    fields: [{ key: 'number', label: 'Phone number', type: 'tel', required: true, placeholder: '+12345678900' }],
    buildPayload: (vals) => `tel:${v(vals, 'number')}`,
  },
  {
    id: 'sms', label: 'SMS', category: 'communication', icon: MessageSquare,
    description: 'Opens the SMS app with number and pre-written message.',
    useCase: 'Competitions, appointment shortcuts, promotions.',
    fields: [
      { key: 'number', label: 'Phone number', type: 'tel', required: true, placeholder: '+12345678900' },
      { key: 'body', label: 'Message', type: 'text', placeholder: 'Pre-written SMS' },
    ],
    buildPayload: (vals) => {
      const n = v(vals, 'number'), b = encodeURIComponent(v(vals, 'body'))
      return b ? `sms:${n}?body=${b}` : `sms:${n}`
    },
  },
  {
    id: 'whatsapp', label: 'WhatsApp', category: 'communication', icon: MessageCircle, popular: true,
    description: 'Opens a WhatsApp chat with a pre-filled message.',
    useCase: 'Customer support, local business contact.',
    fields: [
      { key: 'number', label: 'Phone number (with country code)', type: 'tel', required: true, placeholder: '12345678900' },
      { key: 'text', label: 'Pre-filled message', type: 'text', placeholder: 'Hello! I have a question...' },
    ],
    buildPayload: (vals) => {
      const n = v(vals, 'number').replace(/[^0-9]/g, ''), t = encodeURIComponent(v(vals, 'text'))
      return t ? `https://wa.me/${n}?text=${t}` : `https://wa.me/${n}`
    },
  },
  {
    id: 'whatsapp_business', label: 'WhatsApp Business', category: 'communication', icon: MessageCircleMore,
    description: 'Opens a WhatsApp Business chat with a pre-filled message.',
    useCase: 'Business customer support and catalogs.',
    fields: [
      { key: 'number', label: 'Phone number (with country code)', type: 'tel', required: true, placeholder: '12345678900' },
      { key: 'text', label: 'Pre-filled message', type: 'text', placeholder: 'Hello! I have a question...' },
    ],
    buildPayload: (vals) => {
      const n = v(vals, 'number').replace(/[^0-9]/g, ''), t = encodeURIComponent(v(vals, 'text'))
      return t ? `https://wa.me/${n}?text=${t}` : `https://wa.me/${n}`
    },
  },
  urlType({ id: 'telegram', category: 'communication', icon: Send, label: 'Telegram',
    description: 'Opens a Telegram chat with a username.',
    useCase: 'Channels, support bots, communities.',
    fieldKey: 'username', fieldLabel: 'Telegram username', fieldPlaceholder: 'username',
    build: (u) => `https://t.me/${u}` }),
  urlType({ id: 'skype', category: 'communication', icon: PhoneCall, label: 'Skype Call',
    description: 'Starts a Skype call with a username.',
    useCase: 'International calls, remote teams.',
    fieldKey: 'username', fieldLabel: 'Skype username', fieldPlaceholder: 'live:username',
    build: (u) => `skype:${u}?call` }),
  urlType({ id: 'facetime', category: 'communication', icon: Video, label: 'FaceTime',
    description: 'Starts a FaceTime video call (Apple devices).',
    useCase: 'Apple-to-Apple video calls.',
    fieldKey: 'email', fieldLabel: 'Apple ID email or phone', fieldPlaceholder: 'user@icloud.com',
    build: (u) => `facetime:${u}` }),
  {
    id: 'fax', label: 'Fax', category: 'communication', icon: Phone,
    description: 'Prompts to send a fax to a number.',
    useCase: 'Legal, medical and government offices.',
    fields: [{ key: 'number', label: 'Fax number', type: 'tel', required: true, placeholder: '+12345678900' }],
    buildPayload: (vals) => `fax:${v(vals, 'number')}`,
  },

  // ─────────── SOCIAL MEDIA ───────────
  urlType({ id: 'instagram', category: 'social', icon: Instagram, label: 'Instagram', popular: true,
    description: 'Links to an Instagram profile.',
    useCase: 'Social media promotion and growth.',
    fieldKey: 'username', fieldLabel: 'Username', fieldPlaceholder: 'username',
    build: (u) => `https://instagram.com/${u}` }),
  urlType({ id: 'facebook', category: 'social', icon: Facebook, label: 'Facebook', popular: true,
    description: 'Links to a Facebook page or profile.',
    useCase: 'Social media promotion, business pages.',
    fieldKey: 'page', fieldLabel: 'Page name', fieldPlaceholder: 'pagename',
    build: (u) => `https://facebook.com/${u}` }),
  urlType({ id: 'twitter', category: 'social', icon: Twitter, label: 'Twitter / X',
    description: 'Links to an X (Twitter) profile.',
    useCase: 'Social media promotion.',
    fieldKey: 'username', fieldLabel: 'Username', fieldPlaceholder: 'username',
    build: (u) => `https://x.com/${u}` }),
  urlType({ id: 'youtube', category: 'social', icon: Youtube, label: 'YouTube', popular: true,
    description: 'Links to a YouTube channel or video.',
    useCase: 'Content promotion, channel growth.',
    fieldKey: 'url', fieldLabel: 'Channel or Video URL', fieldPlaceholder: 'https://youtube.com/@channel',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'linkedin', category: 'social', icon: Linkedin, label: 'LinkedIn', popular: true,
    description: 'Links to a LinkedIn profile or company page.',
    useCase: 'Professional networking and recruiting.',
    fieldKey: 'slug', fieldLabel: 'Profile slug', fieldPlaceholder: 'in/username',
    build: (u) => `https://linkedin.com/${u}` }),
  urlType({ id: 'tiktok', category: 'social', icon: Music, label: 'TikTok', popular: true,
    description: 'Links to a TikTok profile.',
    useCase: 'Creator growth, viral campaigns.',
    fieldKey: 'username', fieldLabel: 'Username', fieldPlaceholder: 'username',
    build: (u) => `https://tiktok.com/@${u}` }),
  urlType({ id: 'pinterest', category: 'social', icon: ImageIcon, label: 'Pinterest',
    description: 'Links to a Pinterest profile or board.',
    useCase: 'Visual inspiration, product boards.',
    fieldKey: 'username', fieldLabel: 'Username', fieldPlaceholder: 'username',
    build: (u) => `https://pinterest.com/${u}` }),
  urlType({ id: 'snapchat', category: 'social', icon: Hash, label: 'Snapchat',
    description: 'Links to a Snapchat profile.',
    useCase: 'Youth marketing, AR lenses.',
    fieldKey: 'username', fieldLabel: 'Username', fieldPlaceholder: 'username',
    build: (u) => `https://snapchat.com/add/${u}` }),
  urlType({ id: 'reddit', category: 'social', icon: Hash, label: 'Reddit',
    description: 'Links to a Reddit user, subreddit or post.',
    useCase: 'Community building, AMAs.',
    fieldKey: 'name', fieldLabel: 'User or subreddit', fieldPlaceholder: 'r/subreddit or u/user',
    build: (u) => u.startsWith('r/') || u.startsWith('u/') ? `https://reddit.com/${u}` : `https://reddit.com/user/${u}` }),
  urlType({ id: 'threads', category: 'social', icon: AtSign, label: 'Threads',
    description: 'Links to a Threads profile.',
    useCase: 'Text-first social growth.',
    fieldKey: 'username', fieldLabel: 'Username', fieldPlaceholder: 'username',
    build: (u) => `https://threads.net/@${u}` }),
  urlType({ id: 'discord', category: 'social', icon: Users, label: 'Discord Invite',
    description: 'Links to a Discord server invite.',
    useCase: 'Gaming communities, servers, clubs.',
    fieldKey: 'code', fieldLabel: 'Invite code or URL', fieldPlaceholder: 'abc1234',
    build: (u) => u.startsWith('http') ? u : `https://discord.gg/${u}` }),
  urlType({ id: 'tumblr', category: 'social', icon: Newspaper, label: 'Tumblr',
    description: 'Links to a Tumblr blog.',
    useCase: 'Blogging, fandom communities.',
    fieldKey: 'blog', fieldLabel: 'Blog name', fieldPlaceholder: 'blogname',
    build: (u) => `https://${u}.tumblr.com` }),
  urlType({ id: 'github', category: 'social', icon: QrCode, label: 'GitHub',
    description: 'Links to a GitHub profile or repo.',
    useCase: 'Developer portfolios, open source.',
    fieldKey: 'username', fieldLabel: 'Username', fieldPlaceholder: 'username',
    build: (u) => `https://github.com/${u}` }),
  urlType({ id: 'medium', category: 'social', icon: BookOpen, label: 'Medium',
    description: 'Links to a Medium profile or article.',
    useCase: 'Writer portfolios, article sharing.',
    fieldKey: 'username', fieldLabel: 'Username', fieldPlaceholder: '@username',
    build: (u) => `https://medium.com/@${u.replace('@', '')}` }),
  urlType({ id: 'twitch', category: 'social', icon: Clapperboard, label: 'Twitch',
    description: 'Links to a Twitch channel.',
    useCase: 'Live streaming, gaming.',
    fieldKey: 'channel', fieldLabel: 'Channel name', fieldPlaceholder: 'channelname',
    build: (u) => `https://twitch.tv/${u}` }),
  urlType({ id: 'mastodon', category: 'social', icon: Radio, label: 'Mastodon',
    description: 'Links to a Mastodon profile (full handle).',
    useCase: 'Federated social networking.',
    fieldKey: 'handle', fieldLabel: 'Full handle (@user@instance.social)', fieldPlaceholder: '@user@mastodon.social',
    build: (u) => {
      const m = u.match(/@?([^@]+)@(.+)/)
      return m ? `https://${m[2]}/@${m[1]}` : u
    } }),

  // ─────────── PAYMENTS ───────────
  {
    id: 'upi', label: 'UPI Payment', category: 'payments', icon: IndianRupee, popular: true,
    description: 'Accepts UPI payments from any UPI app. India only.',
    useCase: 'Kirana stores, restaurants, freelancers, any Indian business.',
    fields: [
      { key: 'vpa', label: 'UPI ID / VPA', type: 'text', required: true, placeholder: 'myshop@upi', helper: 'e.g. shop@paytm, merchant@upi' },
      { key: 'name', label: 'Your Name or Business Name', type: 'text', required: true, placeholder: "Ravi's Kirana Store" },
      { key: 'amount', label: 'Amount ₹ (optional)', type: 'number', placeholder: 'Leave blank for customer to enter' },
      { key: 'note', label: 'Payment Note (optional)', type: 'text', placeholder: 'Payment for purchase' },
    ],
    buildPayload: (vals) => {
      const pa = v(vals, 'vpa'), pn = encodeURIComponent(v(vals, 'name')), am = v(vals, 'amount'), tn = encodeURIComponent(v(vals, 'note'))
      let p = `upi://pay?pa=${pa}&pn=${pn}`
      if (am) p += `&am=${am}&cu=INR`
      if (tn) p += `&tn=${tn}`
      return p
    },
  },
  urlType({ id: 'google-pay', category: 'payments', icon: IndianRupee, label: 'Google Pay (India)',
    description: 'Deep-link to Google Pay for a UPI ID.',
    useCase: 'Indian merchants preferring GPay.',
    fieldKey: 'vpa', fieldLabel: 'UPI ID / VPA', fieldPlaceholder: 'merchant@okhdfcbank',
    build: (u) => `upi://pay?pa=${u}` }),
  urlType({ id: 'phonepe', category: 'payments', icon: IndianRupee, label: 'PhonePe',
    description: 'Deep-link to PhonePe for a UPI ID.',
    useCase: 'Indian merchants preferring PhonePe.',
    fieldKey: 'vpa', fieldLabel: 'UPI ID / VPA', fieldPlaceholder: 'merchant@ybl',
    build: (u) => `upi://pay?pa=${u}` }),
  urlType({ id: 'paytm', category: 'payments', icon: IndianRupee, label: 'Paytm',
    description: 'Deep-link to Paytm for a UPI ID.',
    useCase: 'Indian merchants preferring Paytm.',
    fieldKey: 'vpa', fieldLabel: 'UPI ID / VPA', fieldPlaceholder: 'merchant@paytm',
    build: (u) => `upi://pay?pa=${u}` }),
  urlType({ id: 'bharat-qr', category: 'payments', icon: QrCode, label: 'Bharat QR',
    description: 'Interoperable QR for Indian card/UPI payments.',
    useCase: 'Retail merchants accepting any Indian payment app.',
    fieldKey: 'id', fieldLabel: 'Bharat QR merchant ID', fieldPlaceholder: 'merchant123',
    build: (u) => `bharatqr://pay?mid=${u}` }),
  urlType({ id: 'paypal', category: 'payments', icon: Wallet, label: 'PayPal',
    description: 'Links to a PayPal.me payment page.',
    useCase: 'International payments, freelancers, donations.',
    fieldKey: 'username', fieldLabel: 'PayPal.me username', fieldPlaceholder: 'username',
    build: (u) => `https://paypal.me/${u}` }),
  urlType({ id: 'venmo', category: 'payments', icon: Wallet, label: 'Venmo',
    description: 'Links to a Venmo profile for US payments.',
    useCase: 'US peer-to-peer payments.',
    fieldKey: 'username', fieldLabel: 'Venmo username', fieldPlaceholder: 'username',
    build: (u) => `https://venmo.com/${u}` }),
  urlType({ id: 'cashapp', category: 'payments', icon: CreditCard, label: 'Cash App',
    description: 'Links to a Cash App $cashtag.',
    useCase: 'US payments, tipping, small business.',
    fieldKey: 'tag', fieldLabel: '$Cashtag', fieldPlaceholder: 'cashtag',
    build: (u) => `https://cash.app/${u.replace('$', '')}` }),
  {
    id: 'bitcoin', label: 'Bitcoin Address', category: 'payments', icon: Bitcoin,
    description: 'Encodes a Bitcoin wallet address for payments.',
    useCase: 'Crypto payments, donations, web3.',
    fields: [{ key: 'address', label: 'Bitcoin address', type: 'text', required: true, placeholder: 'bc1q...' },
      { key: 'amount', label: 'Amount BTC (optional)', type: 'text', placeholder: '0.001' }],
    buildPayload: (vals) => {
      const a = v(vals, 'address'), amt = v(vals, 'amount')
      return amt ? `bitcoin:${a}?amount=${amt}` : `bitcoin:${a}`
    },
  },
  {
    id: 'ethereum', label: 'Ethereum Address', category: 'payments', icon: CreditCard,
    description: 'Encodes an Ethereum wallet address for payments.',
    useCase: 'Crypto payments, web3, NFTs.',
    fields: [{ key: 'address', label: 'Ethereum address', type: 'text', required: true, placeholder: '0x...' },
      { key: 'amount', label: 'Amount ETH (optional)', type: 'text', placeholder: '0.5' }],
    buildPayload: (vals) => {
      const a = v(vals, 'address'), amt = v(vals, 'amount')
      return amt ? `ethereum:${a}?amount=${amt}` : `ethereum:${a}`
    },
  },

  // ─────────── WIFI & NETWORK ───────────
  {
    id: 'wifi', label: 'WiFi Network', category: 'wifi', icon: Wifi, popular: true,
    description: 'Connects a device to WiFi without typing a password.',
    useCase: 'Cafes, hotels, homes, coworking spaces.',
    fields: [
      { key: 'ssid', label: 'Network Name (SSID)', type: 'text', required: true, placeholder: 'My Home Network' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'MyPassword123' },
      { key: 'security', label: 'Security', type: 'select', options: [
        { label: 'WPA2', value: 'WPA2' }, { label: 'WPA', value: 'WPA' },
        { label: 'WEP', value: 'WEP' }, { label: 'None', value: 'nopass' },
      ], defaultValue: 'WPA2' },
      { key: 'hidden', label: 'Hidden network', type: 'checkbox', defaultValue: false },
    ],
    buildPayload: (vals) => {
      const ssid = v(vals, 'ssid'), pwd = v(vals, 'password'), sec = v(vals, 'security') || 'WPA2', hidden = vals.hidden === true
      const esc = (s: string) => s.replace(/([\\;,":])/g, '\\$1')
      return `WIFI:T:${sec};S:${esc(ssid)};P:${esc(pwd)};${hidden ? 'H:true;' : ''};`
    },
  },
  {
    id: 'wifi-enterprise', label: 'WiFi Enterprise (EAP)', category: 'wifi', icon: Network,
    description: 'Connects to an enterprise (WPA2-EAP) WiFi network.',
    useCase: 'Offices, universities, enterprise networks.',
    fields: [
      { key: 'ssid', label: 'Network Name (SSID)', type: 'text', required: true, placeholder: 'Corp-WiFi' },
      { key: 'user', label: 'Username', type: 'text', required: true, placeholder: 'jdoe' },
      { key: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
      { key: 'eap', label: 'EAP method', type: 'select', options: [
        { label: 'PEAP', value: 'PEAP' }, { label: 'TTLS', value: 'TTLS' }, { label: 'TLS', value: 'TLS' },
      ], defaultValue: 'PEAP' },
    ],
    buildPayload: (vals) => {
      const esc = (s: string) => s.replace(/([\\;,":])/g, '\\$1')
      return `WIFI:T:WPA2-EAP;S:${esc(v(vals, 'ssid'))};H:false;E:${v(vals, 'eap')};I:${esc(v(vals, 'user'))};P:${esc(v(vals, 'password'))};;`
    },
  },

  // ─────────── LOCATION & MAPS ───────────
  {
    id: 'location', label: 'Geo Location', category: 'location', icon: MapPin,
    description: 'Opens the maps app to exact GPS coordinates.',
    useCase: 'Business locations, event venues, delivery points.',
    fields: [
      { key: 'lat', label: 'Latitude', type: 'text', required: true, placeholder: '12.9716' },
      { key: 'lng', label: 'Longitude', type: 'text', required: true, placeholder: '77.5946' },
    ],
    buildPayload: (vals) => `geo:${v(vals, 'lat')},${v(vals, 'lng')}`,
  },
  {
    id: 'googlemaps', label: 'Google Maps', category: 'location', icon: MapPinned,
    description: 'Opens Google Maps to a specific location.',
    useCase: 'Business directions, store locators.',
    fields: [
      { key: 'lat', label: 'Latitude', type: 'text', required: true, placeholder: '12.9716' },
      { key: 'lng', label: 'Longitude', type: 'text', required: true, placeholder: '77.5946' },
    ],
    buildPayload: (vals) => `https://www.google.com/maps?q=${v(vals, 'lat')},${v(vals, 'lng')}`,
  },
  {
    id: 'apple-maps', label: 'Apple Maps', category: 'location', icon: MapPin,
    description: 'Opens Apple Maps to a specific location.',
    useCase: 'iOS users, business directions.',
    fields: [
      { key: 'lat', label: 'Latitude', type: 'text', required: true, placeholder: '12.9716' },
      { key: 'lng', label: 'Longitude', type: 'text', required: true, placeholder: '77.5946' },
    ],
    buildPayload: (vals) => `https://maps.apple.com/?ll=${v(vals, 'lat')},${v(vals, 'lng')}`,
  },
  urlType({ id: 'coordinates', category: 'location', icon: MapPin, label: 'GPS Coordinates',
    description: 'Encodes raw latitude/longitude for any map app.',
    useCase: 'Geocaching, surveying, field work.',
    fieldKey: 'coords', fieldLabel: 'Lat, Lng', fieldPlaceholder: '12.9716,77.5946',
    build: (u) => `geo:${u}` }),

  // ─────────── EVENTS & MEETINGS ───────────
  {
    id: 'calendar', label: 'Calendar Event', category: 'events', icon: CalendarClock,
    description: 'Adds an event to the device calendar.',
    useCase: 'Event invitations and reminders.',
    fields: [
      { key: 'title', label: 'Event title', type: 'text', required: true, placeholder: 'Team Meeting' },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'Conference Room A' },
      { key: 'start', label: 'Start (datetime)', type: 'datetime-local', required: true },
      { key: 'end', label: 'End (datetime)', type: 'datetime-local', required: true },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Event details...' },
    ],
    buildPayload: (vals) => {
      const fmt = (s: string) => s ? s.replace(/[-:]/g, '').replace('T', 'T') + '00' : ''
      const lines = ['BEGIN:VEVENT', `SUMMARY:${v(vals, 'title')}`,
        v(vals, 'location') ? `LOCATION:${v(vals, 'location')}` : '',
        `DTSTART:${fmt(v(vals, 'start'))}`, `DTEND:${fmt(v(vals, 'end'))}`,
        v(vals, 'description') ? `DESCRIPTION:${v(vals, 'description')}` : '', 'END:VEVENT'].filter(Boolean)
      return lines.join('\n')
    },
  },
  urlType({ id: 'google-calendar', category: 'events', icon: Calendar, label: 'Google Calendar Event',
    description: 'Links to a Google Calendar event for one-tap add.',
    useCase: 'Webinars, public events, classes.',
    fieldKey: 'url', fieldLabel: 'Google Calendar event URL', fieldPlaceholder: 'https://calendar.google.com/...',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'eventbrite', category: 'events', icon: Megaphone, label: 'Eventbrite Event',
    description: 'Links to an Eventbrite event page.',
    useCase: 'Ticketed events, meetups.',
    fieldKey: 'url', fieldLabel: 'Eventbrite URL', fieldPlaceholder: 'https://eventbrite.com/e/...',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'zoom', category: 'events', icon: Video, label: 'Zoom Meeting',
    description: 'Joins a Zoom meeting in one tap.',
    useCase: 'Remote meetings, webinars, classes.',
    fieldKey: 'url', fieldLabel: 'Zoom join URL', fieldPlaceholder: 'https://zoom.us/j/123456789',
    build: (u) => u }),
  urlType({ id: 'google-meet', category: 'events', icon: Video, label: 'Google Meet',
    description: 'Joins a Google Meet call in one tap.',
    useCase: 'Quick video calls, school classes.',
    fieldKey: 'url', fieldLabel: 'Google Meet URL', fieldPlaceholder: 'https://meet.google.com/abc-defg-hij',
    build: (u) => u }),
  urlType({ id: 'teams', category: 'events', icon: Users, label: 'Microsoft Teams',
    description: 'Joins a Microsoft Teams meeting in one tap.',
    useCase: 'Corporate meetings, interviews.',
    fieldKey: 'url', fieldLabel: 'Teams join URL', fieldPlaceholder: 'https://teams.microsoft.com/l/meetup-join/...',
    build: (u) => u }),

  // ─────────── CONTENT & MEDIA ───────────
  urlType({ id: 'spotify', category: 'media', icon: Music, label: 'Spotify', popular: true,
    description: 'Links to a Spotify song, album, playlist or artist.',
    useCase: 'Music sharing, gigs, posters.',
    fieldKey: 'url', fieldLabel: 'Spotify URL', fieldPlaceholder: 'https://open.spotify.com/...',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'apple-music', category: 'media', icon: Music, label: 'Apple Music',
    description: 'Links to an Apple Music song, album or playlist.',
    useCase: 'Music sharing for Apple users.',
    fieldKey: 'url', fieldLabel: 'Apple Music URL', fieldPlaceholder: 'https://music.apple.com/...',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'soundcloud', category: 'media', icon: Radio, label: 'SoundCloud',
    description: 'Links to a SoundCloud track or profile.',
    useCase: 'Indie music, podcasts, DJ sets.',
    fieldKey: 'url', fieldLabel: 'SoundCloud URL', fieldPlaceholder: 'https://soundcloud.com/...',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'podcast', category: 'media', icon: Mic2, label: 'Podcast / RSS',
    description: 'Links to a podcast episode or RSS feed.',
    useCase: 'Podcast promotion, subscriptions.',
    fieldKey: 'url', fieldLabel: 'Podcast or RSS URL', fieldPlaceholder: 'https://feeds.example.com/podcast',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'pdf', category: 'media', icon: FileText, label: 'PDF Document',
    description: 'Links to a PDF file hosted online.',
    useCase: 'Menus, brochures, manuals, reports.',
    fieldKey: 'url', fieldLabel: 'PDF URL', fieldPlaceholder: 'https://example.com/menu.pdf',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'image', category: 'media', icon: ImageIcon, label: 'Image File',
    description: 'Links to an image file (PNG/JPG) hosted online.',
    useCase: 'Posters, artwork, product photos.',
    fieldKey: 'url', fieldLabel: 'Image URL', fieldPlaceholder: 'https://example.com/poster.png',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'video', category: 'media', icon: Film, label: 'Video File',
    description: 'Links to a video file (MP4) hosted online.',
    useCase: 'Tutorials, promos, reels.',
    fieldKey: 'url', fieldLabel: 'Video URL', fieldPlaceholder: 'https://example.com/video.mp4',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'vimeo', category: 'media', icon: MonitorPlay, label: 'Vimeo',
    description: 'Links to a Vimeo video.',
    useCase: 'High-quality video sharing, film portfolios.',
    fieldKey: 'url', fieldLabel: 'Vimeo URL', fieldPlaceholder: 'https://vimeo.com/123456',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'ebook', category: 'media', icon: BookOpen, label: 'eBook / ePub',
    description: 'Links to an eBook or ePub file.',
    useCase: 'Authors, publishers, lead magnets.',
    fieldKey: 'url', fieldLabel: 'eBook URL', fieldPlaceholder: 'https://example.com/book.epub',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'gallery', category: 'media', icon: Camera, label: 'Image Gallery',
    description: 'Links to an online photo gallery or album.',
    useCase: 'Photographers, events, real estate.',
    fieldKey: 'url', fieldLabel: 'Gallery URL', fieldPlaceholder: 'https://photos.example.com/album',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),

  // ─────────── BUSINESS & MARKETING ───────────
  urlType({ id: 'coupon', category: 'business', icon: Tag, label: 'Coupon',
    description: 'Links to a coupon or discount landing page.',
    useCase: 'Retail promotions, loyalty offers.',
    fieldKey: 'url', fieldLabel: 'Coupon URL', fieldPlaceholder: 'https://example.com/coupon',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'feedback', category: 'business', icon: MessageSquare, label: 'Feedback Form',
    description: 'Links to a feedback or contact form.',
    useCase: 'Restaurants, hotels, services.',
    fieldKey: 'url', fieldLabel: 'Form URL', fieldPlaceholder: 'https://forms.example.com/feedback',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'google-review', category: 'business', icon: Star, label: 'Google Review', popular: true,
    description: 'Links to your Google Business review page.',
    useCase: 'Boost local SEO and reputation.',
    fieldKey: 'url', fieldLabel: 'Google review URL', fieldPlaceholder: 'https://g.page/r/...',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'rating', category: 'business', icon: ThumbsUp, label: 'Rating Page',
    description: 'Links to a rating page (Trustpilot, Yelp, etc.).',
    useCase: 'Build trust and social proof.',
    fieldKey: 'url', fieldLabel: 'Rating URL', fieldPlaceholder: 'https://trustpilot.com/...',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'landing-page', category: 'business', icon: Megaphone, label: 'Landing Page',
    description: 'Links to a campaign landing page.',
    useCase: 'Ad campaigns, product launches.',
    fieldKey: 'url', fieldLabel: 'Landing page URL', fieldPlaceholder: 'https://example.com/launch',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'restaurant-menu', category: 'business', icon: BookOpen, label: 'Restaurant Menu', popular: true,
    description: 'Links to a digital restaurant menu.',
    useCase: 'Cafes, restaurants, cloud kitchens.',
    fieldKey: 'url', fieldLabel: 'Menu URL', fieldPlaceholder: 'https://example.com/menu',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'price-list', category: 'business', icon: IndianRupee, label: 'Price List',
    description: 'Links to a services or product price list.',
    useCase: 'Salons, services, wholesalers.',
    fieldKey: 'url', fieldLabel: 'Price list URL', fieldPlaceholder: 'https://example.com/prices',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'product-page', category: 'business', icon: ShoppingBag, label: 'Product Page',
    description: 'Links to an e-commerce product page.',
    useCase: 'Packaging, ads, in-store displays.',
    fieldKey: 'url', fieldLabel: 'Product URL', fieldPlaceholder: 'https://shop.example.com/product',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'survey', category: 'business', icon: ListChecks, label: 'Survey',
    description: 'Links to a survey or questionnaire (Google Forms, Typeform).',
    useCase: 'Market research, NPS, event feedback.',
    fieldKey: 'url', fieldLabel: 'Survey URL', fieldPlaceholder: 'https://forms.gle/...',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  urlType({ id: 'newsletter', category: 'business', icon: Newspaper, label: 'Newsletter Signup',
    description: 'Links to an email newsletter signup page.',
    useCase: 'Creators, brands, list building.',
    fieldKey: 'url', fieldLabel: 'Signup URL', fieldPlaceholder: 'https://example.com/subscribe',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),

  // ─────────── INFO & TEXT ───────────
  {
    id: 'text', label: 'Plain Text', category: 'info', icon: Type, popular: true,
    description: 'Displays text directly when scanned.',
    useCase: 'Instructions, product info, recipes, internal codes.',
    fields: [{ key: 'text', label: 'Text content', type: 'textarea', required: true, placeholder: 'Type up to 2000 characters...' }],
    buildPayload: (vals) => v(vals, 'text'),
  },
  urlType({ id: 'notes', category: 'info', icon: NotebookPen, label: 'Notes / Markdown',
    description: 'Links to a notes or markdown document.',
    useCase: 'Meeting notes, specs, shared docs.',
    fieldKey: 'url', fieldLabel: 'Notes URL', fieldPlaceholder: 'https://notes.example.com/doc',
    build: (u) => /^https?:\/\//.test(u) ? u : `https://${u}` }),
  {
    id: 'ai-art-qr', label: 'Image QR', phase: 2, icon: Sparkles,
    description: 'Upload an image and embed a scannable QR code into it.',
    useCase: 'Brand campaigns, artistic QR codes, product packaging.',
    fields: [
      { key: 'data', label: 'QR Data (URL or text)', type: 'text', required: true, placeholder: 'https://example.com', helper: 'The destination the QR code will link to.' },
    ],
    buildPayload: (vals) => v(vals, 'data'),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Lookups
// ─────────────────────────────────────────────────────────────────────────────
export const QR_TYPE_MAP: Record<string, QrTypeDef> = QR_TYPES.reduce(
  (acc, t) => { acc[t.id] = t; return acc }, {} as Record<string, QrTypeDef>
)

export const QR_CATEGORY_MAP: Record<QrCategory, QrCategoryDef> = QR_CATEGORIES.reduce(
  (acc, c) => { acc[c.id] = c; return acc }, {} as Record<QrCategory, QrCategoryDef>
)

export function typesByCategory(cat: QrCategory): QrTypeDef[] {
  return QR_TYPES.filter((t) => t.category === cat)
}

export function popularTypes(): QrTypeDef[] {
  return QR_TYPES.filter((t) => t.popular)
}

// ─────────────────────────────────────────────────────────────────────────────
// URL slugs — every QR type gets its own SEO-friendly path, e.g. /wifi-qr-code
// ─────────────────────────────────────────────────────────────────────────────
function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/\([^)]*\)/g, '') // drop parentheticals e.g. "(India)"
    .replace(/[^a-z0-9]+/g, '-') // non-alnum → hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}

/** SEO URL slug for a QR type, e.g. "WiFi Network" → "wifi-network-qr-code" */
export function typeSlug(typeId: string): string {
  const t = QR_TYPE_MAP[typeId]
  if (!t) return typeId
  return `${slugify(t.label)}-qr-code`
}

/** Reverse lookup: "/wifi-network-qr-code" → "wifi". null if no match. */
export function typeIdFromSlug(slug: string): string | null {
  for (const t of QR_TYPES) {
    if (typeSlug(t.id) === slug) return t.id
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO content — generated per-type with category context (consistent + scalable)
// ─────────────────────────────────────────────────────────────────────────────
export interface QrSeo {
  title: string
  description: string
  keywords: string[]
  howTo: string[]
  faqs: QrFaq[]
}

export function getSeo(typeId: string): QrSeo {
  const t = QR_TYPE_MAP[typeId]
  if (!t) {
    return {
      title: 'QR Code Generator — Create Free QR Codes | CreateAnQRCode',
      description: 'Generate free QR codes for URLs, WiFi, vCard, UPI and 80+ types. No watermark, unlimited scans, PNG & SVG export.',
      keywords: ['qr code generator', 'free qr code', 'qr code maker'],
      howTo: [], faqs: [],
    }
  }
  const cat = QR_CATEGORY_MAP[t.category]
  const title = t.seoTitle ?? `${t.label} QR Code Generator — Free & No Watermark | CreateAnQRCode`
  const description = t.seoDescription ?? `Create a free ${t.label} QR code with ${t.description.replace(/\.$/, '')}. No watermark, unlimited scans, customize colors & logo. Download PNG or SVG.`
  const keywords = t.keywords ?? [
    `${t.label.toLowerCase()} qr code`,
    `${t.label.toLowerCase()} qr code generator`,
    'free qr code generator',
    `${cat.label.toLowerCase()} qr code`,
    'create qr code',
  ]
  const howTo = t.howTo ?? [
    `Choose "${t.label}" from the QR type selector.`,
    `Fill in the required ${t.fields.filter((f) => f.required).map((f) => f.label.toLowerCase()).join(', ') || 'details'}.`,
    'Customize colors, dots, eyes, gradient and add a logo.',
    'Preview live, then download as PNG or SVG — free, no watermark.',
  ]
  const faqs = t.faqs ?? [
    { q: `Is the ${t.label} QR code really free?`, a: `Yes. Generating a ${t.label} QR code on CreateAnQRCode is 100% free with no watermark. Static codes work forever; dynamic codes (for analytics & editable destinations) are free up to 10 codes.` },
    { q: `Does the ${t.label} QR code expire?`, a: 'Static QR codes never expire — they keep working forever, even on the Free plan. Only dynamic QR codes require an active plan for redirect tracking.' },
    { q: `Can I add my logo to the ${t.label} QR code?`, a: 'Yes. Upload a PNG/SVG logo (up to 1MB), adjust its size and padding, and use error correction level Q or H so the code stays scannable.' },
    { q: 'What formats can I download?', a: 'PNG (raster, great for web and small prints) and SVG (vector, infinitely scalable for large prints). Both are free and watermark-free.' },
  ]
  return { title, description, keywords, howTo, faqs }
}

// Back-compat exports (older code referenced phase splitting)
export const PHASE_1_TYPES = QR_TYPES
export const PHASE_2_TYPES: QrTypeDef[] = []
export const COMING_SOON_TYPES: string[] = []
