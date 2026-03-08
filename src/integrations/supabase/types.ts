export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_tiers: {
        Row: {
          atm_daily_limit: number
          created_at: string
          daily_transaction_limit: number
          id: string
          max_cards: number
          monthly_transaction_limit: number
          single_transaction_limit: number
          tier: Database["public"]["Enums"]["account_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          atm_daily_limit?: number
          created_at?: string
          daily_transaction_limit?: number
          id?: string
          max_cards?: number
          monthly_transaction_limit?: number
          single_transaction_limit?: number
          tier?: Database["public"]["Enums"]["account_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          atm_daily_limit?: number
          created_at?: string
          daily_transaction_limit?: number
          id?: string
          max_cards?: number
          monthly_transaction_limit?: number
          single_transaction_limit?: number
          tier?: Database["public"]["Enums"]["account_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          account_number: string | null
          amount: number
          biller_name: string
          category: string
          created_at: string
          due_date: string
          id: string
          is_paid: boolean
          paid_at: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          amount: number
          biller_name: string
          category: string
          created_at?: string
          due_date: string
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          amount?: number
          biller_name?: string
          category?: string
          created_at?: string
          due_date?: string
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          card_format: string
          card_name: string | null
          card_number_last4: string
          card_type: string
          created_at: string
          expiry_month: number
          expiry_year: number
          id: string
          is_active: boolean
          is_frozen: boolean
          shipping_status: string | null
          user_id: string
        }
        Insert: {
          card_format?: string
          card_name?: string | null
          card_number_last4?: string
          card_type?: string
          created_at?: string
          expiry_month?: number
          expiry_year?: number
          id?: string
          is_active?: boolean
          is_frozen?: boolean
          shipping_status?: string | null
          user_id: string
        }
        Update: {
          card_format?: string
          card_name?: string | null
          card_number_last4?: string
          card_type?: string
          created_at?: string
          expiry_month?: number
          expiry_year?: number
          id?: string
          is_active?: boolean
          is_frozen?: boolean
          shipping_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          features_bill_pay: boolean
          features_cards: boolean
          features_crypto: boolean
          features_forex: boolean
          features_premium: boolean
          features_savings: boolean
          features_send_money: boolean
          features_stocks: boolean
          is_sanctioned: boolean
          is_supported: boolean
          max_daily_transaction: number | null
          max_single_transaction: number | null
          name: string
          phone_code: string
          region: string
          regulatory_notes: string | null
          requires_enhanced_kyc: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string
          features_bill_pay?: boolean
          features_cards?: boolean
          features_crypto?: boolean
          features_forex?: boolean
          features_premium?: boolean
          features_savings?: boolean
          features_send_money?: boolean
          features_stocks?: boolean
          is_sanctioned?: boolean
          is_supported?: boolean
          max_daily_transaction?: number | null
          max_single_transaction?: number | null
          name: string
          phone_code: string
          region: string
          regulatory_notes?: string | null
          requires_enhanced_kyc?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          features_bill_pay?: boolean
          features_cards?: boolean
          features_crypto?: boolean
          features_forex?: boolean
          features_premium?: boolean
          features_savings?: boolean
          features_send_money?: boolean
          features_stocks?: boolean
          is_sanctioned?: boolean
          is_supported?: boolean
          max_daily_transaction?: number | null
          max_single_transaction?: number | null
          name?: string
          phone_code?: string
          region?: string
          regulatory_notes?: string | null
          requires_enhanced_kyc?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      crypto_holdings: {
        Row: {
          amount: number
          avg_buy_price: number
          created_at: string
          crypto_code: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          avg_buy_price?: number
          created_at?: string
          crypto_code: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          avg_buy_price?: number
          created_at?: string
          crypto_code?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country_code: string | null
          created_at: string
          full_name: string | null
          handle: string | null
          id: string
          phone_number: string | null
          referral_code: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          full_name?: string | null
          handle?: string | null
          id: string
          phone_number?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          full_name?: string | null
          handle?: string | null
          id?: string
          phone_number?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      rate_alerts: {
        Row: {
          created_at: string
          direction: string
          from_currency: string
          id: string
          is_active: boolean
          is_triggered: boolean
          target_rate: number
          to_currency: string
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          from_currency?: string
          id?: string
          is_active?: boolean
          is_triggered?: boolean
          target_rate: number
          to_currency: string
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          from_currency?: string
          id?: string
          is_active?: boolean
          is_triggered?: boolean
          target_rate?: number
          to_currency?: string
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          frequency: string
          id: string
          is_active: boolean
          next_payment_date: string
          recipient: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          next_payment_date: string
          recipient: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          next_payment_date?: string
          recipient?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          reward_amount: number
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          reward_amount?: number
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          reward_amount?: number
          status?: string
        }
        Relationships: []
      }
      stock_holdings: {
        Row: {
          avg_buy_price: number
          created_at: string
          id: string
          shares: number
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_buy_price?: number
          created_at?: string
          id?: string
          shares?: number
          ticker: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_buy_price?: number
          created_at?: string
          id?: string
          shares?: number
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          recipient: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          recipient?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          recipient?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_geo_verification: {
        Row: {
          block_reason: string | null
          browser_country: string | null
          country_code: string
          created_at: string
          id: string
          id_document_type: string | null
          id_document_verified: boolean
          ip_country: string | null
          is_blocked: boolean
          last_location_check: string | null
          location_mismatch: boolean
          phone_number: string
          phone_verified: boolean
          updated_at: string
          user_id: string
          vpn_detected: boolean
        }
        Insert: {
          block_reason?: string | null
          browser_country?: string | null
          country_code: string
          created_at?: string
          id?: string
          id_document_type?: string | null
          id_document_verified?: boolean
          ip_country?: string | null
          is_blocked?: boolean
          last_location_check?: string | null
          location_mismatch?: boolean
          phone_number: string
          phone_verified?: boolean
          updated_at?: string
          user_id: string
          vpn_detected?: boolean
        }
        Update: {
          block_reason?: string | null
          browser_country?: string | null
          country_code?: string
          created_at?: string
          id?: string
          id_document_type?: string | null
          id_document_verified?: boolean
          ip_country?: string | null
          is_blocked?: boolean
          last_location_check?: string | null
          location_mismatch?: boolean
          phone_number?: string
          phone_verified?: boolean
          updated_at?: string
          user_id?: string
          vpn_detected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_geo_verification_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          savings_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          savings_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          savings_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_waitlist_count: { Args: never; Returns: number }
    }
    Enums: {
      account_tier: "personal" | "pro" | "business" | "bank"
      transaction_status: "pending" | "completed" | "failed"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "send"
        | "receive"
        | "purchase"
        | "cashback"
        | "interest"
        | "conversion"
        | "bill_payment"
        | "welcome_bonus"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_tier: ["personal", "pro", "business", "bank"],
      transaction_status: ["pending", "completed", "failed"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "send",
        "receive",
        "purchase",
        "cashback",
        "interest",
        "conversion",
        "bill_payment",
        "welcome_bonus",
      ],
    },
  },
} as const
