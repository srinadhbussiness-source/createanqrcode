-- CreateAnQRCode — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor

-- Users table (extends Supabase auth.users with app-specific fields)
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    plan TEXT DEFAULT 'free',
    "trialEndsAt" TIMESTAMPTZ,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    "dateFormat" TEXT DEFAULT 'DD/MM/YYYY',
    "notifSecurity" BOOLEAN DEFAULT true,
    "notifTrial" BOOLEAN DEFAULT true,
    "notifScans" BOOLEAN DEFAULT true,
    "notifExpiry" BOOLEAN DEFAULT true,
    "notifDigest" BOOLEAN DEFAULT false,
    "notifUpdates" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "verifyToken" TEXT,
    "verifyTokenExp" TIMESTAMPTZ,
    "resetToken" TEXT,
    "resetTokenExp" TIMESTAMPTZ,
    role TEXT DEFAULT 'user',
    suspended BOOLEAN DEFAULT false,
    "suspendedAt" TIMESTAMPTZ,
    "suspendedReason" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN DEFAULT false,
    "twoFactorBackupCodes" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Session" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    device TEXT,
    browser TEXT,
    country TEXT,
    current BOOLEAN DEFAULT false,
    "twoFactorPending" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "QrCode" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "qrType" TEXT NOT NULL,
    "isDynamic" BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    "staticPayload" TEXT,
    "shortCode" TEXT UNIQUE,
    "destinationUrl" TEXT,
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMPTZ,
    "maxScans" INTEGER,
    "redirectRules" TEXT,
    "activatesAt" TIMESTAMPTZ,
    design TEXT NOT NULL,
    "logoDataUrl" TEXT,
    "overlayDataUrl" TEXT,
    "overlayOpacity" INTEGER DEFAULT 40,
    favorite BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,
    trashed BOOLEAN DEFAULT false,
    "trashedAt" TIMESTAMPTZ,
    "folderId" TEXT,
    tags TEXT DEFAULT '[]',
    "scanCount" INTEGER DEFAULT 0,
    "downloadCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Folder" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#7C3AED',
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Scan" (
    id TEXT PRIMARY KEY,
    "qrCodeId" TEXT NOT NULL REFERENCES "QrCode"(id) ON DELETE CASCADE,
    "countryCode" TEXT,
    "countryName" TEXT,
    city TEXT,
    "deviceType" TEXT,
    os TEXT,
    browser TEXT,
    referrer TEXT,
    language TEXT,
    "ipHash" TEXT,
    "scannedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_scan_qr" ON "Scan"("qrCodeId", "scannedAt");

CREATE TABLE IF NOT EXISTS "Template" (
    id TEXT PRIMARY KEY,
    "userId" TEXT REFERENCES "User"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    "isPro" BOOLEAN DEFAULT false,
    design TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ApiKey" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "keyHash" TEXT UNIQUE NOT NULL,
    prefix TEXT NOT NULL,
    scopes TEXT DEFAULT 'read',
    "lastUsed" TIMESTAMPTZ,
    "apiRequests" INTEGER DEFAULT 0,
    "lastResetAt" TIMESTAMPTZ DEFAULT NOW(),
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Payment" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    plan TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT DEFAULT 'paid',
    "invoiceId" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    id TEXT PRIMARY KEY,
    "actorId" TEXT,
    "actorEmail" TEXT,
    action TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    metadata TEXT,
    ip TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_audit_created" ON "AuditLog"("createdAt");

CREATE TABLE IF NOT EXISTS "QrCodeRevision" (
    id TEXT PRIMARY KEY,
    "qrCodeId" TEXT NOT NULL REFERENCES "QrCode"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "staticPayload" TEXT,
    "destinationUrl" TEXT,
    design TEXT NOT NULL,
    "logoDataUrl" TEXT,
    "overlayDataUrl" TEXT,
    "overlayOpacity" INTEGER DEFAULT 40,
    "redirectRules" TEXT,
    "expiresAt" TIMESTAMPTZ,
    "maxScans" INTEGER,
    status TEXT NOT NULL,
    "editedBy" TEXT,
    "editedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_revision_qr" ON "QrCodeRevision"("qrCodeId", "editedAt");

CREATE TABLE IF NOT EXISTS "Webhook" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT DEFAULT 'scan',
    active BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS (service role key bypasses it anyway, but this simplifies dev)
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QrCode" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Folder" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Scan" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Template" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QrCodeRevision" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Webhook" DISABLE ROW LEVEL SECURITY;
