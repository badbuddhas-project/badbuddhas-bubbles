/**
 * POST /api/auth/merge-accounts — merges an existing email-only account into a Telegram account.
 * Transfers user_practices, favorites, and sums user_stats; deletes the email-only record.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Merges an existing email account into the current Telegram account.
// Called when the email entered in ConnectEmailModal is already registered.
export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  try {
    const { telegram_id, email, password } = await request.json()

    if (!telegram_id || !email || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    console.log('[merge-accounts] Start merge for telegram_id:', telegram_id, 'email:', email)

    // --- 1. Find the email-only account ---
    const { data: emailUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (!emailUser) {
      console.log('[merge-accounts] Email account not found:', email)
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    console.log('[merge-accounts] Step 1: Found email account id:', emailUser.id)

    // --- 2. Verify password via Supabase Auth ---
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !signInData.user) {
      console.log('[merge-accounts] Step 2: Wrong password for email:', email, signInError?.message)
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    }

    const authUserId = signInData.user.id
    console.log('[merge-accounts] Step 2: Password verified, auth user id:', authUserId)

    // --- 3. Find the Telegram account ---
    const { data: tgUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single()

    if (!tgUser) {
      console.log('[merge-accounts] Step 3: TG user not found for telegram_id:', telegram_id)
      return NextResponse.json({ error: 'Telegram user not found' }, { status: 404 })
    }

    console.log('[merge-accounts] Step 3: Found TG account id:', tgUser.id)

    // --- 4. Merge stats ---
    const { data: emailStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', emailUser.id)
      .maybeSingle()

    const { data: tgStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', tgUser.id)
      .maybeSingle()

    if (emailStats && tgStats) {
      const lastDate = (a: string | null, b: string | null) => {
        if (!a) return b
        if (!b) return a
        return a > b ? a : b
      }

      await supabase
        .from('user_stats')
        .update({
          total_practices:  tgStats.total_practices  + emailStats.total_practices,
          total_minutes:    tgStats.total_minutes    + emailStats.total_minutes,
          current_streak:   Math.max(tgStats.current_streak,  emailStats.current_streak),
          longest_streak:   Math.max(tgStats.longest_streak,  emailStats.longest_streak),
          last_practice_date: lastDate(tgStats.last_practice_date, emailStats.last_practice_date),
          streak_lives:     Math.max(tgStats.streak_lives ?? 3, emailStats.streak_lives ?? 3),
        })
        .eq('user_id', tgUser.id)

      console.log('[merge-accounts] Step 4: Stats merged')
    } else {
      console.log('[merge-accounts] Step 4: No stats to merge (emailStats:', !!emailStats, 'tgStats:', !!tgStats, ')')
    }

    // --- 5. Move user_practices ---
    await supabase
      .from('user_practices')
      .update({ user_id: tgUser.id })
      .eq('user_id', emailUser.id)

    console.log('[merge-accounts] Step 5: user_practices transferred')

    // --- 6. Move favorites (skip duplicates) ---
    const { data: tgFavs } = await supabase
      .from('favorites')
      .select('practice_id')
      .eq('user_id', tgUser.id)

    const tgFavSet = new Set((tgFavs ?? []).map((f) => f.practice_id))

    const { data: emailFavs } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', emailUser.id)

    for (const fav of emailFavs ?? []) {
      if (!tgFavSet.has(fav.practice_id)) {
        await supabase.from('favorites').insert({
          user_id:     tgUser.id,
          practice_id: fav.practice_id,
        })
      }
    }

    await supabase.from('favorites').delete().eq('user_id', emailUser.id)

    console.log('[merge-accounts] Step 6: Favorites transferred')

    // --- 7. Clear email from web account to release unique constraint ---
    await supabase
      .from('users')
      .update({ email: null, supabase_user_id: null })
      .eq('id', emailUser.id)

    console.log('[merge-accounts] Step 7: Cleared email from web account id:', emailUser.id)

    // --- 8. Update Telegram user with email info ---
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email,
        password_hash:      emailUser.password_hash ?? null,
        supabase_user_id:   authUserId,
        email_confirmed_at: signInData.user.email_confirmed_at ?? emailUser.email_confirmed_at ?? null,
      })
      .eq('id', tgUser.id)

    if (updateError) {
      console.error('[merge-accounts] Step 8 FAILED: Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
    }

    // --- 9. Verify update succeeded ---
    const { data: mergedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', tgUser.id)
      .single()

    if (!mergedUser?.email || mergedUser.email !== email) {
      console.error('[merge-accounts] Step 9 FAILED: Email not set after update. Expected:', email, 'Got:', mergedUser?.email)
      return NextResponse.json({ error: 'Merge verification failed — duplicate preserved' }, { status: 500 })
    }

    console.log('[merge-accounts] Step 9: Verified merged user id:', mergedUser.id, 'email:', mergedUser.email)

    // --- 10. Delete the email-only account (safe — update verified above) ---
    const { error: deleteError } = await supabase.from('users').delete().eq('id', emailUser.id)

    if (deleteError) {
      console.error('[merge-accounts] Step 10: Delete failed:', deleteError.message)
    } else {
      console.log('[merge-accounts] Step 10: Deleted email-only account id:', emailUser.id)
    }

    return NextResponse.json({ success: true, merged_user: mergedUser })
  } catch (err) {
    console.error('[merge-accounts]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
