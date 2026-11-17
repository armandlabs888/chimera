/** Shared erase list shown on Settings and the delete confirmation modal. */
export const ACCOUNT_DELETE_ERASE_ITEMS = [
  'Your profile and helper profile',
  'Addresses and location verification, including home address and coordinates',
  'Requests, offers, and job history',
  'Messages',
  'Saved helpers and jobs',
  'Urgent job text settings',
  'Photos, including your profile photo and listing photos',
] as const

export const ACCOUNT_DELETE_WARNING =
  'This cannot be undone. You will need to create a new account to use BlockSide again.'

/** Short note on the delete modal; email send is best-effort after deletion. */
export const ACCOUNT_DELETE_EMAIL_NOTE =
  'We will send a confirmation email to the address on your account.'
