#!/usr/bin/env node
/**
 * Live Supabase persistence + negative authorization checks (no screenshots).
 * Uses pre-seeded confirmed Auth users (created via SQL) to avoid email rate limits.
 */
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const PASSWORD = 'BeamTest-Pass1!'

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  process.exit(1)
}

function client() {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function signIn(email) {
  const sb = client()
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw error
  const user = data.user
  assert.ok(user)
  const profile = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!profile.data) {
    const inserted = await sb.from('profiles').insert({ id: user.id, name: email.split('@')[0] }).select('*').single()
    assert.equal(inserted.error, null, inserted.error?.message)
  }
  return { sb, user, email, password: PASSWORD }
}

async function main() {
  const a = await signIn('beam.requester@chimera.test')
  const b = await signIn('beam.helper@chimera.test')
  const stranger = await signIn('beam.stranger@chimera.test')
  console.log('ok signed in 3 users')

  const req = await a.sb
    .from('help_requests')
    .insert({
      title: 'Live persistence sofa lift',
      details: 'Need two people for a couch up stairs',
      category: 'junk-removal',
      neighborhood: 'east-austin',
      when_option: 'today',
      when_label: 'Today',
      budget: 60,
      requester_id: a.user.id,
      image: '',
      status: 'open',
    })
    .select('*')
    .single()
  assert.equal(req.error, null, req.error?.message)
  console.log('ok create request', req.data.id)

  const seen = await b.sb.from('help_requests').select('id').eq('id', req.data.id).single()
  assert.equal(seen.error, null, seen.error?.message)

  const forged = await a.sb.from('offers').insert({
    request_id: req.data.id,
    helper_id: a.user.id,
    price: 1,
    note: 'self offer',
    status: 'pending',
  })
  assert.ok(forged.error, 'requester must not offer on own request')
  console.log('ok reject self-offer')

  const offer = await b.sb
    .from('offers')
    .insert({
      request_id: req.data.id,
      helper_id: b.user.id,
      price: 55,
      note: 'I can help in an hour',
      eta: '1 hour',
      status: 'pending',
    })
    .select('*')
    .single()
  assert.equal(offer.error, null, offer.error?.message)
  console.log('ok helper offer')

  const badAccept = await stranger.sb.rpc('accept_offer', { p_offer_id: offer.data.id })
  assert.ok(badAccept.error, 'stranger must not accept offer')
  console.log('ok reject stranger accept:', badAccept.error.message)

  const accept = await a.sb.rpc('accept_offer', { p_offer_id: offer.data.id })
  assert.equal(accept.error, null, accept.error?.message)
  console.log('ok requester accept')

  const threads = await a.sb
    .from('message_threads')
    .select('*')
    .eq('request_id', req.data.id)
    .single()
  assert.equal(threads.error, null, threads.error?.message)

  const badMsg = await stranger.sb.from('messages').insert({
    thread_id: threads.data.id,
    request_id: req.data.id,
    sender_id: stranger.user.id,
    body: 'intrusion',
  })
  assert.ok(badMsg.error, 'stranger must not insert message')
  console.log('ok reject stranger message')

  const msg = await b.sb.from('messages').insert({
    thread_id: threads.data.id,
    request_id: req.data.id,
    sender_id: b.user.id,
    body: 'On my way',
  })
  assert.equal(msg.error, null, msg.error?.message)

  const b2 = client()
  await b2.auth.signInWithPassword({ email: b.email, password: b.password })
  const persisted = await b2.from('help_requests').select('*').eq('id', req.data.id).single()
  assert.equal(persisted.data.status, 'accepted')
  const msgs = await b2.from('messages').select('body').eq('thread_id', threads.data.id)
  assert.ok(msgs.data.some((m) => m.body === 'On my way'))
  console.log('ok cross-session persistence')

  const complete = await a.sb.rpc('complete_request', { p_request_id: req.data.id })
  assert.equal(complete.error, null, complete.error?.message)

  const badReview = await stranger.sb.rpc('submit_review', {
    p_request_id: req.data.id,
    p_to_id: b.user.id,
    p_rating: 5,
    p_comment: 'nope',
  })
  assert.ok(badReview.error, 'stranger must not review')
  console.log('ok reject stranger review')

  const review = await a.sb.rpc('submit_review', {
    p_request_id: req.data.id,
    p_to_id: b.user.id,
    p_rating: 5,
    p_comment: 'Great help',
  })
  assert.equal(review.error, null, review.error?.message)
  console.log('ok participant review')

  console.log('live persistence checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
