'use client'

import { useUser } from '@/hooks/useUser'
import { TabBar } from '@/components/TabBar'

export default function CatalogPage() {
  const { user } = useUser()
  const isPremium = user?.is_premium ?? false

  return (
    <main style={{ minHeight: '100vh', background: '#000', padding: '44px 16px 80px' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#CBCBCB', marginBottom: 12 }}>
        {isPremium ? 'Практики' : 'Каталог'}
      </div>
      <div style={{ fontSize: 14, color: 'rgba(203,203,203,0.45)' }}>Скоро</div>
      <TabBar isPremium={isPremium} />
    </main>
  )
}
