import { createClient } from '@supabase/supabase-js';
import { SubscriptionCheck } from '@/types/subscription';

export async function checkSubscriptionByEmail(email: string): Promise<SubscriptionCheck> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from('subscriptions')
    .select('status, expires_at')
    .eq('email', email)
    .eq('status', 'active')
    .single();

  if (!data) return { hasSubscription: false, status: 'none', expiresAt: null };

  return {
    hasSubscription: true,
    status: data.status,
    expiresAt: data.expires_at,
  };
}

export async function checkSubscriptionByUserId(userId: string): Promise<SubscriptionCheck> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from('subscriptions')
    .select('status, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!data) return { hasSubscription: false, status: 'none', expiresAt: null };

  return {
    hasSubscription: true,
    status: data.status,
    expiresAt: data.expires_at,
  };
}
