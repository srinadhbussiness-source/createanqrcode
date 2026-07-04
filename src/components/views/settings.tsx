'use client'

import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  User, Globe, Bell, Shield, Database, Loader2, Save, Upload, Trash2,
  Monitor, Smartphone, Tablet, LogOut, Lock, Download, AlertTriangle,
  Check, Mail, Crown, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator,
} from '@/components/ui/input-otp'
import { useRouterStore, useAuthStore } from '@/lib/stores'
import { api, ApiError } from '@/lib/api'
import { PLAN_LIMITS, type Plan, type UserRecord, DEFAULT_DESIGN } from '@/lib/types'
import { getQrDataUrl } from '@/lib/qr-generate'
import { initials, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Hong_Kong', 'Asia/Bangkok', 'Asia/Seoul', 'Asia/Karachi', 'Asia/Dhaka',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland', 'UTC',
]

const DATE_FORMATS = [
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
]

interface SessionRow {
  id: string
  device: string | null
  browser: string | null
  country: string | null
  current: boolean
  createdAt: string
}

const DEVICE_ICON: Record<string, typeof Monitor> = { Desktop: Monitor, Mobile: Smartphone, Tablet: Tablet }

export function SettingsView() {
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)

  // Profile state
  const [name, setName] = useState(user?.name ?? '')
  const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl ?? null)
  const avatarRef = useRef<HTMLInputElement>(null)

  // Preferences
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Asia/Kolkata')
  const [dateFormat, setDateFormat] = useState(user?.dateFormat ?? 'dd/MM/yyyy')

  // Notifications
  const [notif, setNotif] = useState({
    notifSecurity: user?.notifSecurity ?? true,
    notifTrial: user?.notifTrial ?? true,
    notifScans: user?.notifScans ?? false,
    notifExpiry: user?.notifExpiry ?? false,
    notifDigest: user?.notifDigest ?? false,
    notifUpdates: user?.notifUpdates ?? true,
  })

  // Security
  const [pwDialogOpen, setPwDialogOpen] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [signOutAllOpen, setSignOutAllOpen] = useState(false)

  // Two-Factor Authentication (TOTP). Setup flow has 3 sub-states inside the
  // same dialog: (1) scan QR, (2) verify code, (3) show backup codes.
  const [twoFactorOpen, setTwoFactorOpen] = useState(false)
  const [twoFactorStage, setTwoFactorStage] = useState<'scan' | 'backup'>('scan')
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null)
  const [twoFactorOtpauth, setTwoFactorOtpauth] = useState<string | null>(null)
  const [twoFactorQr, setTwoFactorQr] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [disable2faOpen, setDisable2faOpen] = useState(false)
  const [disable2faPw, setDisable2faPw] = useState('')

  // Data & Privacy
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [exporting, setExporting] = useState(false)

  const plan = (user?.plan ?? 'free') as Plan
  const limits = PLAN_LIMITS[plan]

  // ---- Save mutations ----
  const profileMut = useMutation({
    mutationFn: (patch: Partial<UserRecord>) => api.patch<UserRecord>('/api/settings', patch),
    onSuccess: (u) => {
      updateUser({ name: u.name, avatarUrl: u.avatarUrl })
      toast.success('Profile saved')
    },
    onError: () => toast.error('Failed to save profile'),
  })

  const prefsMut = useMutation({
    mutationFn: (patch: { timezone?: string; dateFormat?: string }) => api.patch<UserRecord>('/api/settings', patch),
    onSuccess: (u) => {
      updateUser({ timezone: u.timezone, dateFormat: u.dateFormat })
      toast.success('Preferences saved')
    },
    onError: () => toast.error('Failed to save preferences'),
  })

  const notifMut = useMutation({
    mutationFn: (patch: typeof notif) => api.patch<UserRecord>('/api/settings', patch),
    onSuccess: (u) => {
      updateUser({
        notifSecurity: u.notifSecurity, notifTrial: u.notifTrial, notifScans: u.notifScans,
        notifExpiry: u.notifExpiry, notifDigest: u.notifDigest, notifUpdates: u.notifUpdates,
      })
      toast.success('Notifications saved')
    },
    onError: () => toast.error('Failed to save notifications'),
  })

  const deleteMut = useMutation({
    mutationFn: () => api.del('/api/settings'),
    onSuccess: () => {
      toast.success('Account deleted')
      logout()
      navigate('home')
    },
    onError: () => toast.error('Failed to delete account'),
  })

  const qc = useQueryClient()

  // ---- Sessions (real, replaces MOCK_SESSIONS) ----
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<{ data: SessionRow[] }>('/api/sessions'),
  })
  const sessions = sessionsData?.data ?? []

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.del(`/api/sessions/${id}`),
    onSuccess: () => {
      toast.success('Session revoked')
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to revoke session'),
  })

  const signOutAllMut = useMutation({
    mutationFn: () => api.post<{ revoked: number }>('/api/sessions/revoke-all'),
    onSuccess: (res) => {
      toast.success(`Signed out of ${res.revoked} other session${res.revoked === 1 ? '' : 's'}`)
      setSignOutAllOpen(false)
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to sign out others'),
  })

  // ---- Change password (real) ----
  const changePwMut = useMutation({
    mutationFn: (vars: { currentPassword: string; newPassword: string }) =>
      api.post('/api/settings/password', vars),
    onSuccess: () => {
      toast.success('Password updated — other sessions signed out')
      setPwDialogOpen(false)
      setCurPw(''); setNewPw(''); setConfirmPw('')
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to update password'),
  })

  // ---- 2FA: setup → verify → backup codes ----
  const setup2faMut = useMutation({
    mutationFn: () => api.post<{ secret: string; otpauthUrl: string }>('/api/auth/2fa/setup'),
    onSuccess: async (res) => {
      setTwoFactorSecret(res.secret)
      setTwoFactorOtpauth(res.otpauthUrl)
      // Render the otpauth URL as a QR PNG so the user can scan it with their
      // authenticator app. Uses the existing getQrDataUrl helper.
      try {
        const dataUrl = await getQrDataUrl(res.otpauthUrl, DEFAULT_DESIGN, null, 256)
        setTwoFactorQr(dataUrl)
      } catch {
        setTwoFactorQr(null)
      }
      setTwoFactorStage('scan')
      setTwoFactorCode('')
      setBackupCodes(null)
      setTwoFactorOpen(true)
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to start 2FA setup'),
  })

  const verify2faMut = useMutation({
    mutationFn: (token: string) =>
      api.post<{ ok: boolean; backupCodes: string[] }>('/api/auth/2fa/verify', { token }),
    onSuccess: (res) => {
      updateUser({ twoFactorEnabled: true })
      setBackupCodes(res.backupCodes)
      setTwoFactorStage('backup')
      toast.success('Two-factor authentication enabled')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Verification failed'),
  })

  const disable2faMut = useMutation({
    mutationFn: (password: string) => api.post('/api/auth/2fa/disable', { password }),
    onSuccess: () => {
      updateUser({ twoFactorEnabled: false })
      setDisable2faOpen(false)
      setDisable2faPw('')
      toast.success('Two-factor authentication disabled')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to disable 2FA'),
  })

  // ---- Handlers ----
  const onAvatar = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setAvatar(dataUrl)
      profileMut.mutate({ avatarUrl: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    setAvatar(null)
    profileMut.mutate({ avatarUrl: null })
  }

  const saveProfile = () => {
    profileMut.mutate({ name: name.trim() })
  }

  const savePrefs = () => {
    prefsMut.mutate({ timezone, dateFormat })
  }

  const saveNotifs = () => {
    notifMut.mutate(notif)
  }

  const changePassword = () => {
    if (!curPw) {
      toast.error('Enter your current password')
      return
    }
    if (!newPw || newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
      toast.error('New password must be 8+ chars with one uppercase and one number')
      return
    }
    if (newPw !== confirmPw) {
      toast.error('Passwords do not match')
      return
    }
    changePwMut.mutate({ currentPassword: curPw, newPassword: newPw })
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/export', {
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
      })
      if (!res.ok) throw new Error('Export failed')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `createanqrcode-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const pwStrength = (() => {
    let s = 0
    if (newPw.length >= 8) s++
    if (/[A-Z]/.test(newPw)) s++
    if (/[0-9]/.test(newPw)) s++
    if (/[^A-Za-z0-9]/.test(newPw)) s++
    return s
  })()
  const passwordsMatch = newPw && newPw === confirmPw

  // ---- 2FA helpers ----
  function closeTwoFactorDialog() {
    setTwoFactorOpen(false)
    setTwoFactorSecret(null)
    setTwoFactorOtpauth(null)
    setTwoFactorQr(null)
    setTwoFactorCode('')
    setBackupCodes(null)
  }

  function downloadBackupCodes() {
    if (!backupCodes) return
    const lines = [
      '# CreateAnQRCode two-factor backup codes',
      '# Store these somewhere safe. Each code is single-use.',
      '# If you lose your authenticator device, use these to sign in.',
      '',
      ...backupCodes,
    ].join('\n')
    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'createanqrcode-2fa-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup codes downloaded')
  }

  const twoFactorEnabled = !!user?.twoFactorEnabled

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, preferences, security, and data.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Database className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Data &amp; Privacy</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-4">
          <Card className="border-border max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="h-full w-full object-cover rounded-full" />
                  ) : (
                    <AvatarFallback className="bg-brand-muted text-brand text-lg font-semibold">
                      {initials(name, user?.email)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => avatarRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload new
                  </Button>
                  {avatar && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeAvatar}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                    </Button>
                  )}
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onAvatar(e.target.files?.[0])}
                  />
                </div>
              </div>

              <Separator />

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  value={user?.email ?? ''}
                  disabled
                  className="bg-muted/50 text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  <Mail className="mr-1 inline h-3 w-3" />
                  Cannot be changed — contact support to update your email.
                </p>
              </div>

              <Separator />

              {/* Plan info */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-brand" />
                  <span className="text-sm font-medium">Plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize border-brand/40 text-brand">{plan}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => navigate('billing')}>
                    Manage <Crown className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveProfile}
                  disabled={profileMut.isPending || name === (user?.name ?? '')}
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {profileMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="mt-4">
          <Card className="border-border max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used for displaying dates and times in your account.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Date format</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Example: {formatDate(new Date().toISOString(), dateFormat)}
                </p>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={savePrefs}
                  disabled={prefsMut.isPending || (timezone === user?.timezone && dateFormat === user?.dateFormat)}
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {prefsMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <Card className="border-border max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
              <p className="text-xs text-muted-foreground">
                Choose what we email you about.
              </p>
            </CardHeader>
            <CardContent className="space-y-1">
              <NotifRow
                label="Security alerts"
                description="New device sign-ins, password changes, API key activity."
                checked={notif.notifSecurity}
                onCheckedChange={(v) => setNotif((s) => ({ ...s, notifSecurity: v }))}
              />
              <NotifRow
                label="Trial reminders"
                description="Reminders before your trial ends."
                checked={notif.notifTrial}
                onCheckedChange={(v) => setNotif((s) => ({ ...s, notifTrial: v }))}
              />
              <NotifRow
                label="Scan milestones"
                description="Get notified when your QR codes hit scan milestones."
                checked={notif.notifScans}
                onCheckedChange={(v) => setNotif((s) => ({ ...s, notifScans: v }))}
                locked={plan === 'free' || plan === 'starter'}
                lockedLabel="Pro+"
              />
              <NotifRow
                label="QR expiry alerts"
                description="Get notified when dynamic QR codes are about to expire."
                checked={notif.notifExpiry}
                onCheckedChange={(v) => setNotif((s) => ({ ...s, notifExpiry: v }))}
                locked={plan === 'free' || plan === 'starter'}
                lockedLabel="Pro+"
              />
              <NotifRow
                label="Weekly digest"
                description="A weekly summary of your scan activity, top QR codes, and trends."
                checked={notif.notifDigest}
                onCheckedChange={(v) => setNotif((s) => ({ ...s, notifDigest: v }))}
                locked={plan !== 'business'}
                lockedLabel="Business"
              />
              <NotifRow
                label="Product updates"
                description="Occasional emails about new features and improvements."
                checked={notif.notifUpdates}
                onCheckedChange={(v) => setNotif((s) => ({ ...s, notifUpdates: v }))}
              />
              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button
                  onClick={saveNotifs}
                  disabled={notifMut.isPending}
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {notifMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-4">
          <div className="space-y-4 max-w-2xl">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Password</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">
                      Last changed: <span className="font-medium">{formatDate(user?.createdAt ?? null)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Use a strong, unique password.</p>
                  </div>
                  <Button variant="outline" onClick={() => setPwDialogOpen(true)}>
                    <Lock className="mr-2 h-4 w-4" /> Change password
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-brand" />
                  Two-Factor Authentication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {twoFactorEnabled ? 'Enabled' : 'Not enabled'}
                      </p>
                      {twoFactorEnabled && (
                        <Badge variant="secondary" className="bg-brand-muted text-brand text-[10px]">
                          <ShieldCheck className="mr-1 h-2.5 w-2.5" /> 2FA on
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {twoFactorEnabled
                        ? 'Your account requires a 6-digit code from your authenticator app at sign-in.'
                        : 'Add a second factor (TOTP) so a stolen password alone can\u2019t sign in. Works with Google Authenticator, Authy, 1Password, etc.'}
                    </p>
                  </div>
                  {twoFactorEnabled ? (
                    <Button
                      variant="outline"
                      onClick={() => { setDisable2faPw(''); setDisable2faOpen(true) }}
                      className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/5"
                    >
                      Disable 2FA
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setup2faMut.mutate()}
                      disabled={setup2faMut.isPending}
                      className="shrink-0 bg-brand text-brand-foreground hover:bg-brand/90"
                    >
                      {setup2faMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                      Enable 2FA
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Active sessions</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSignOutAllOpen(true)}>
                  <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out all others
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {sessions.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Loading sessions…</p>
                )}
                {sessions.map((s) => {
                  const DIcon = (s.device && DEVICE_ICON[s.device]) || Monitor
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3',
                        s.current ? 'border-brand/40 bg-brand-muted/40' : 'border-border'
                      )}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <DIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {s.device ?? 'Device'} · {s.browser ?? 'Browser'}
                          {s.current && (
                            <Badge variant="secondary" className="ml-2 bg-brand-muted text-brand text-[10px]">Current</Badge>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.country ?? 'Unknown location'} · {s.current ? 'Now' : formatDate(s.createdAt)}
                        </p>
                      </div>
                      {!s.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={revokeMut.isPending}
                          onClick={() => revokeMut.mutate(s.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data & Privacy */}
        <TabsContent value="data" className="mt-4">
          <div className="space-y-4 max-w-2xl">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Export your data</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Download all your QR codes, folders, payments, and settings as a JSON file.
                </p>
                <Button onClick={exportData} disabled={exporting} variant="outline">
                  {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export data
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Danger zone
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Delete account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all associated data. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(true)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete account
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Change password dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cur-pw">Current password</Label>
              <Input id="cur-pw" type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <Input id="new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              {/* Strength bar */}
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full',
                      i < pwStrength ? (
                        pwStrength <= 1 ? 'bg-destructive' : pwStrength <= 2 ? 'bg-muted-foreground' : 'bg-foreground'
                      ) : 'bg-muted'
                    )}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Use 8+ chars with uppercase, numbers, and symbols.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirm-pw"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className={cn(
                    confirmPw && !passwordsMatch && 'border-destructive focus-visible:ring-destructive/30'
                  )}
                />
                {confirmPw && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <Check className="h-4 w-4 text-foreground" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPwDialogOpen(false); setCurPw(''); setNewPw(''); setConfirmPw('') }}>
              Cancel
            </Button>
            <Button
              onClick={changePassword}
              disabled={!curPw || !newPw || !passwordsMatch || changePwMut.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {changePwMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign out all others */}
      <AlertDialog open={signOutAllOpen} onOpenChange={setSignOutAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of all other sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out of every device except this one. You will need to log in again on those devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => signOutAllMut.mutate()}
              disabled={signOutAllMut.isPending}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {signOutAllMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign out all others
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete account */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>permanently delete</strong> your account, all QR codes, scan data,
              folders, templates, API keys, and payment history. <strong>This cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type <code className="rounded bg-muted px-1.5 py-0.5 text-xs">DELETE</code> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="border-destructive/40"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMut.mutate()}
              disabled={deleteConfirm !== 'DELETE' || deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Permanently delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2FA setup dialog — scan + verify, then show backup codes once */}
      <Dialog open={twoFactorOpen} onOpenChange={(o) => { if (!o) closeTwoFactorDialog() }}>
        <DialogContent className="sm:max-w-md">
          {twoFactorStage === 'scan' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-brand" /> Set up two-factor authentication
                </DialogTitle>
                <DialogDescription>
                  Scan this QR with your authenticator app (Google Authenticator, Authy, 1Password…), then enter the 6-digit code it shows.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-center rounded-lg border border-border bg-card p-3">
                  {twoFactorQr ? (
                    <img src={twoFactorQr} alt="2FA setup QR code" className="h-48 w-48" />
                  ) : (
                    <div className="grid h-48 w-48 place-items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {twoFactorSecret && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Or enter this code manually:</p>
                    <code className="block break-all rounded-md border border-border bg-muted px-2 py-1.5 text-[11px]">
                      {twoFactorSecret}
                    </code>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Enter the 6-digit code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(v) => setTwoFactorCode(v)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeTwoFactorDialog}>Cancel</Button>
                <Button
                  onClick={() => verify2faMut.mutate(twoFactorCode.replace(/\s+/g, ''))}
                  disabled={twoFactorCode.replace(/\s+/g, '').length < 6 || verify2faMut.isPending}
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {verify2faMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify &amp; enable
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-brand-muted text-brand">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center">Save your backup codes</DialogTitle>
                <DialogDescription className="text-center">
                  <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    These codes are shown only once.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  If you lose your authenticator device, use one of these codes to sign in. Each code is single-use.
                </p>
                {backupCodes && (
                  <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-muted/40 p-3">
                    {backupCodes.map((c, i) => (
                      <code key={i} className="text-center text-xs">{c}</code>
                    ))}
                  </div>
                )}
                <Button onClick={downloadBackupCodes} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" /> Download backup codes
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={closeTwoFactorDialog} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA — requires the current password */}
      <Dialog open={disable2faOpen} onOpenChange={(o) => { if (!o) setDisable2faPw(''); setDisable2faOpen(o) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> Disable two-factor authentication?
            </DialogTitle>
            <DialogDescription>
              Enter your password to confirm. After this, your account will be protected by your password alone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disable-2fa-pw">Current password</Label>
            <Input
              id="disable-2fa-pw"
              type="password"
              value={disable2faPw}
              onChange={(e) => setDisable2faPw(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDisable2faOpen(false); setDisable2faPw('') }}>Cancel</Button>
            <Button
              onClick={() => disable2faMut.mutate(disable2faPw)}
              disabled={!disable2faPw || disable2faMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disable2faMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NotifRow({
  label, description, checked, onCheckedChange, locked, lockedLabel,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  locked?: boolean
  lockedLabel?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card/50 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {locked && (
            <Badge variant="secondary" className="bg-brand-muted text-brand text-[10px] gap-1">
              <Lock className="h-2.5 w-2.5" /> {lockedLabel}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked && !locked}
        onCheckedChange={onCheckedChange}
        disabled={locked}
      />
    </div>
  )
}

export default SettingsView
