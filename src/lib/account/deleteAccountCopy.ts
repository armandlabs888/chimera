/** Shared erase list shown on Settings and the delete confirmation modal. */
export const ACCOUNT_DELETE_ERASE_ITEMS = [
  'Your profile and helper profile',
  'Addresses and location verification, including home address and coordinates',
  'Requests, offers, and job history',
  'Messages',
  'Saved helpers',
  'Urgent job text settings',
  'Photos, including your profile photo and listing photos',
] as const

export const ACCOUNT_DELETE_WARNING =
  'This cannot be undone. You will need to create a new account to use HouseCall again.'
