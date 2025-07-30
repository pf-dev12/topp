import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export type Database = {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      branch_users: {
        Row: {
          id: string
          branch_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          user_id?: string
          created_at?: string
        }
      }
      menu_categories: {
        Row: {
          id: string
          name: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_order?: number
          created_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string
          price: number
          available: boolean
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string
          price: number
          available?: boolean
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string
          price?: number
          available?: boolean
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          branch_id: string
          table_number: string
          status: 'New' | 'Preparing' | 'Ready'
          total_amount: number
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          table_number: string
          status?: 'New' | 'Preparing' | 'Ready'
          total_amount?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          table_number?: string
          status?: 'New' | 'Preparing' | 'Ready'
          total_amount?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          quantity: number
          unit_price: number
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id: string
          quantity?: number
          unit_price: number
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string
          quantity?: number
          unit_price?: number
          notes?: string
          created_at?: string
        }
      }
    }
  }
}