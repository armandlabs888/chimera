import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type AdminClient = SupabaseClient<Database>

const LIST_PAGE = 100
const REMOVE_BATCH = 100

/** Reject empty / non-UUID ids so we never list or wipe a whole bucket with prefix "". */
const USER_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function assertStorageUserId(userId: string): void {
  if (typeof userId !== 'string' || !userId.trim() || !USER_ID_UUID_RE.test(userId.trim())) {
    throw new Error('Invalid user id for storage deletion')
  }
}

/**
 * Recursively list object paths under a prefix in a storage bucket.
 * Supabase folders typically have `id === null` and no file metadata.
 */
async function listObjectPathsRecursive(
  admin: AdminClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  if (!prefix) throw new Error('Storage list prefix required')
  const paths: string[] = []
  const queue: string[] = [prefix.replace(/\/$/, '')]

  while (queue.length) {
    const folder = queue.shift()!
    let offset = 0
    for (;;) {
      const { data, error } = await admin.storage.from(bucket).list(folder, {
        limit: LIST_PAGE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (error) throw new Error(error.message || `Failed to list ${bucket}`)
      if (!data?.length) break

      for (const item of data) {
        if (!item.name || item.name === '.emptyFolderPlaceholder') continue
        const fullPath = folder ? `${folder}/${item.name}` : item.name
        const isFolder = item.id == null
        if (isFolder) queue.push(fullPath)
        else paths.push(fullPath)
      }

      if (data.length < LIST_PAGE) break
      offset += LIST_PAGE
    }
  }

  return paths
}

async function removePaths(
  admin: AdminClient,
  bucket: string,
  paths: string[],
): Promise<void> {
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const chunk = paths.slice(i, i + REMOVE_BATCH)
    const { error } = await admin.storage.from(bucket).remove(chunk)
    if (error) throw new Error(error.message || `Failed to remove from ${bucket}`)
  }
}

/** Delete every object under `beam-media/{userId}/` (recursive, paginated). */
export async function deleteBeamMediaForUser(
  admin: AdminClient,
  userId: string,
): Promise<void> {
  assertStorageUserId(userId)
  const paths = await listObjectPathsRecursive(admin, 'beam-media', userId.trim())
  if (paths.length) await removePaths(admin, 'beam-media', paths)
}

/**
 * Delete every object for this user in the private `helper-verification` bucket.
 * Paths are namespaced as `{userId}/...` (see verification submit RPC).
 */
export async function deleteHelperVerificationMediaForUser(
  admin: AdminClient,
  userId: string,
): Promise<void> {
  assertStorageUserId(userId)
  const paths = await listObjectPathsRecursive(admin, 'helper-verification', userId.trim())
  if (paths.length) await removePaths(admin, 'helper-verification', paths)
}

/** Wipe all owned storage objects before hard-deleting the auth user. */
export async function deleteAllUserStorage(
  admin: AdminClient,
  userId: string,
): Promise<void> {
  assertStorageUserId(userId)
  await deleteBeamMediaForUser(admin, userId)
  await deleteHelperVerificationMediaForUser(admin, userId)
}
