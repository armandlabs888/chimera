-- Offer RLS policies call this helper; signed-in users must be able to execute it.
grant execute on function private.helper_is_offer_verified(uuid) to authenticated;
