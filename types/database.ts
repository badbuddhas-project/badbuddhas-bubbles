export type PracticeCategory = 'relax' | 'balance' | 'energize'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          telegram_id: number | null
          username: string | null
          first_name: string | null
          last_name: string | null
          is_premium: boolean
          created_at: string
          email: string | null
          verified_email: string | null
          email_confirmed_at: string | null
          auth_provider: string
          supabase_user_id: string | null
        }
        Insert: {
          id?: string
          telegram_id?: number | null
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          is_premium?: boolean
          created_at?: string
          email?: string | null
          verified_email?: string | null
          email_confirmed_at?: string | null
          auth_provider?: string
          supabase_user_id?: string | null
        }
        Update: {
          id?: string
          telegram_id?: number | null
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          is_premium?: boolean
          created_at?: string
          email?: string | null
          verified_email?: string | null
          email_confirmed_at?: string | null
          auth_provider?: string
          supabase_user_id?: string | null
        }
        Relationships: []
      }
      practices: {
        Row: {
          id: string
          title: string
          title_ru: string
          duration_seconds: number
          category: PracticeCategory
          language: string
          instructor_name: string
          instructor_avatar_url: string | null
          audio_url: string
          preview_image_url: string | null
          is_premium: boolean
          is_visible: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          title_ru: string
          duration_seconds: number
          category: PracticeCategory
          language?: string
          instructor_name: string
          instructor_avatar_url?: string | null
          audio_url: string
          preview_image_url?: string | null
          is_premium?: boolean
          is_visible?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          title_ru?: string
          duration_seconds?: number
          category?: PracticeCategory
          language?: string
          instructor_name?: string
          instructor_avatar_url?: string | null
          audio_url?: string
          preview_image_url?: string | null
          is_premium?: boolean
          is_visible?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          practice_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          practice_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          practice_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'favorites_practice_id_fkey'
            columns: ['practice_id']
            referencedRelation: 'practices'
            referencedColumns: ['id']
          }
        ]
      }
      user_stats: {
        Row: {
          user_id: string
          current_streak: number
          longest_streak: number
          total_practices: number
          total_minutes: number
          last_practice_date: string | null
          streak_lives: number
        }
        Insert: {
          user_id: string
          current_streak?: number
          longest_streak?: number
          total_practices?: number
          total_minutes?: number
          last_practice_date?: string | null
          streak_lives?: number
        }
        Update: {
          user_id?: string
          current_streak?: number
          longest_streak?: number
          total_practices?: number
          total_minutes?: number
          last_practice_date?: string | null
          streak_lives?: number
        }
        Relationships: [
          {
            foreignKeyName: 'user_stats_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      user_practices: {
        Row: {
          id: string
          user_id: string
          practice_id: string
          completed_at: string
          listened_seconds: number
        }
        Insert: {
          id?: string
          user_id: string
          practice_id: string
          completed_at?: string
          listened_seconds?: number
        }
        Update: {
          id?: string
          user_id?: string
          practice_id?: string
          completed_at?: string
          listened_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: 'user_practices_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_practices_practice_id_fkey'
            columns: ['practice_id']
            referencedRelation: 'practices'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      practice_category: PracticeCategory
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row']
export type Practice = Database['public']['Tables']['practices']['Row']
export type Favorite = Database['public']['Tables']['favorites']['Row']
export type UserStats = Database['public']['Tables']['user_stats']['Row']
export type UserPractice = Database['public']['Tables']['user_practices']['Row']
