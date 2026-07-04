import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'AI QR generation is not available in this deployment.' }, { status: 501 })
}
