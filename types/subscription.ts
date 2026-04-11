export interface Subscription {
  id: string;
  user_id: string;
  email: string;
  status: 'active' | 'expired';
  expires_at: string | null;
  gc_deal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionCheck {
  hasSubscription: boolean;
  status: 'active' | 'expired' | 'none';
  expiresAt: string | null;
}
