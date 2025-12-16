// This file will be generated from Supabase schema
// For now, we'll define a basic structure
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          national_id: string | null
          profile_photo_url: string | null
          wallet_balance: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      events: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          event_type: string | null
          start_date: string
          end_date: string
          is_multi_day: boolean
          location_name: string | null
          location_address: string | null
          location_coordinates: unknown | null
          theme_id: string | null
          status: string
          created_by: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      tickets: {
        Row: {
          id: string
          ticket_number: string
          ticket_type_id: string
          event_id: string
          purchaser_id: string | null
          purchaser_email: string
          purchaser_name: string
          qr_signature: string
          qr_payload: unknown
          status: string
          payment_id: string | null
          promoter_id: string | null
          assigned_to_email: string | null
          assigned_to_name: string | null
          scan_count: number
          first_scan_at: string | null
          last_scan_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tickets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>
      }
      payments: {
        Row: {
          id: string
          idempotency_key: string
          user_id: string | null
          amount: string
          currency: string
          provider: string
          provider_payment_id: string | null
          status: string
          payment_method: string
          metadata: unknown | null
          webhook_received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
    }
    Views: {}
    Functions: {}
  }
}

