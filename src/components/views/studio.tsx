'use client'

/**
 * StudioView — the full-page QR Studio dashboard view.
 *
 * This is the "Create QR" page (like Analytics, Folders, etc.) — NOT a
 * slide-over panel. It renders the same reusable QrStudioContent (3-panel
 * layout: type picker + preview + properties) but as a full dashboard page
 * with a header + back button, so the LHS sidebar stays as the primary nav.
 *
 * Edit mode: navigated to via /studio?id={qrId} (e.g. from the "Edit QR Code"
 * button on the QR detail page). The QrStudioContent loads the QR by id and
 * PATCHes on save.
 *
 * Create mode: navigated to via /studio (or /studio?type={typeId} for a
 * pre-selected type, e.g. from quick-create chips). POSTs a new QR on save.
 */

import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouterStore } from '@/lib/stores'
import { QrStudioContent } from '@/components/qr-studio'
import { QR_TYPE_MAP } from '@/lib/qr-types'

export function StudioView() {
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)

  // Edit mode: ?id={qrId}. Create mode with preset type: ?type={typeId}.
  const editId = params.id ?? null
  const initialType = params.type && QR_TYPE_MAP[params.type] ? params.type : null
  const isEditMode = !!editId

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Page header — sticky, with back button + title */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(editId ? 'qr-detail' : 'dashboard')} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <h1 className="text-lg font-bold tracking-tight">
              {isEditMode ? 'Edit QR Code' : 'Create QR Code'}
            </h1>
          </div>
        </div>
      </header>

      {/* The 3-panel Studio content fills the remaining space */}
      <QrStudioContent
        editId={editId}
        initialType={initialType}
        onClose={() => navigate(editId ? 'qr-detail' : 'qr-codes', editId ? { id: editId } : {})}
      />
    </div>
  )
}

export default StudioView
