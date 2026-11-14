import { NextResponse } from 'next/server'
import { isValidAccountDeleteConfirm } from '@/lib/account/deleteConfirm'
import { deleteAllUserStorage } from '@/lib/account/deleteUserStorage'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const UNAVAILABLE =
  'Account deletion is temporarily unavailable. Please try again later.'

/**
 * Hard-delete the signed-in user's account.
 * Auth comes from the session cookie only; never trust a user id from the body.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { confirm?: unknown }
    if (!isValidAccountDeleteConfirm(body.confirm)) {
      return NextResponse.json(
        { error: 'Type I understand to confirm account deletion.' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 })
    }

    // Storage first so we never leave orphaned media after auth deletion.
    try {
      await deleteAllUserStorage(admin, user.id)
    } catch {
      console.error('[account/delete] storage cleanup failed')
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 })
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error('[account/delete] auth delete failed')
      return NextResponse.json(
        { error: 'Could not delete your account. Please try again later.' },
        { status: 500 },
      )
    }

    // Best-effort: clear this browser's session cookies.
    try {
      await supabase.auth.signOut()
    } catch {
      // User is already gone; cookie clear is best-effort.
    }

    return NextResponse.json({ ok: true })
  } catch {
    console.error('[account/delete] unexpected failure')
    return NextResponse.json(
      { error: 'Could not delete your account. Please try again later.' },
      { status: 500 },
    )
  }
}
