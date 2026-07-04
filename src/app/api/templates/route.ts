
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { SYSTEM_TEMPLATES } from '@/lib/templates-data'
import type { QrDesign } from '@/lib/types'

export async function GET() {
  const session = await getSession()
  const userTemplates = session
    ? await db.template.findMany({ where: { userId: session.userId }, orderBy: { createdAt: 'desc' } })
    : []
  return NextResponse.json({
    data: [
      ...SYSTEM_TEMPLATES.map((t) => ({ id: t.id, name: t.name, category: t.category, isPro: t.isPro, design: t.design, userId: null, isSystem: true })),
      ...userTemplates.map((t) => ({
        id: t.id, name: t.name, category: 'custom' as const, isPro: false,
        design: JSON.parse(t.design) as QrDesign, userId: t.userId, isSystem: false,
        createdAt: t.createdAt.toISOString(),
      })),
    ],
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, design } = await req.json() as { name: string; design: QrDesign }
  if (!name?.trim()) return NextResponse.json({ error: 'Template name required.' }, { status: 400 })
  const t = await db.template.create({
    data: { userId: session.userId, name: name.trim(), category: 'custom', isPro: false, design: JSON.stringify(design) },
  })
  return NextResponse.json({
    id: t.id, name: t.name, category: 'custom', isPro: false,
    design: JSON.parse(t.design) as QrDesign, userId: t.userId, isSystem: false,
    createdAt: t.createdAt.toISOString(),
  }, { status: 201 })
}
