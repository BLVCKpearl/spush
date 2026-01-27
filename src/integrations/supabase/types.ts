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
      admin_audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_user_id: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_details: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          is_active: boolean
          venue_id: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          venue_id?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_details_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          name: string
          price_kobo: number
          sort_order: number
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name: string
          price_kobo: number
          sort_order?: number
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name?: string
          price_kobo?: number
          sort_order?: number
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          new_status: Database["public"]["Enums"]["order_status"] | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["order_status"] | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["order_status"] | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_snapshot: Json
          menu_item_id: string
          order_id: string
          quantity: number
          unit_price_kobo: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_snapshot?: Json
          menu_item_id: string
          order_id: string
          quantity: number
          unit_price_kobo: number
        }
        Update: {
          created_at?: string
          id?: string
          item_snapshot?: Json
          menu_item_id?: string
          order_id?: string
          quantity?: number
          unit_price_kobo?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_rate_limits: {
        Row: {
          created_at: string
          id: string
          table_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          table_id: string
        }
        Update: {
          created_at?: string
          id?: string
          table_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string | null
          expires_at: string | null
          id: string
          idempotency_key: string | null
          order_reference: string
          payment_confirmed: boolean
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["order_status"]
          table_id: string | null
          table_number: number
          total_kobo: number
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          order_reference: string
          payment_confirmed?: boolean
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          table_number: number
          total_kobo?: number
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          order_reference?: string
          payment_confirmed?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string | null
          table_number?: number
          total_kobo?: number
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_rate_limits: {
        Row: {
          created_at: string
          id: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_claims: {
        Row: {
          bank_name: string | null
          claimed_at: string
          created_at: string
          id: string
          notes: string | null
          order_id: string
          proof_url: string | null
          sender_name: string | null
        }
        Insert: {
          bank_name?: string | null
          claimed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          proof_url?: string | null
          sender_name?: string | null
        }
        Update: {
          bank_name?: string | null
          claimed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          proof_url?: string | null
          sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_claims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_confirmations: {
        Row: {
          confirmed_at: string
          confirmed_by: string
          created_at: string
          id: string
          method: string
          notes: string | null
          order_id: string
        }
        Insert: {
          confirmed_at?: string
          confirmed_by: string
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          order_id: string
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_confirmations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          id: string
          image_url: string
          order_id: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          image_url: string
          order_id: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          order_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          updated_at: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          updated_at?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          updated_at?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          qr_token: string
          venue_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          qr_token: string
          venue_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          qr_token?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_feature_flags: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          is_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          is_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          tenant_role: Database["public"]["Enums"]["tenant_role"] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          tenant_role?: Database["public"]["Enums"]["tenant_role"] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          tenant_role?: Database["public"]["Enums"]["tenant_role"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_settings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          created_at: string
          id: string
          is_suspended: boolean
          name: string
          suspended_at: string | null
          suspended_by: string | null
          venue_slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_suspended?: boolean
          name: string
          suspended_at?: string | null
          suspended_by?: string | null
          venue_slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_suspended?: boolean
          name?: string
          suspended_at?: string | null
          suspended_by?: string | null
          venue_slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      tables_public: {
        Row: {
          active: boolean | null
          id: string | null
          label: string | null
          venue_id: string | null
        }
        Insert: {
          active?: boolean | null
          id?: string | null
          label?: string | null
          venue_id?: string | null
        }
        Update: {
          active?: boolean | null
          id?: string | null
          label?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      check_order_rate_limit: { Args: { p_table_id: string }; Returns: boolean }
      check_password_reset_rate_limit: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      count_active_admins: { Args: never; Returns: number }
      count_active_tenant_admins: {
        Args: { _tenant_id: string }
        Returns: number
      }
      expire_pending_orders: { Args: never; Returns: number }
      generate_invitation_token: { Args: never; Returns: string }
      generate_order_reference: { Args: never; Returns: string }
      generate_qr_token: { Args: never; Returns: string }
      generate_venue_slug: { Args: { base_text: string }; Returns: string }
      get_order_expiry_minutes: {
        Args: { p_venue_id: string }
        Returns: number
      }
      get_user_tenant_ids: { Args: never; Returns: string[] }
      has_payment_confirmation: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_access: { Args: { _tenant_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_staff: { Args: never; Returns: boolean }
      is_any_tenant_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_staff_of_tenant: { Args: { _tenant_id: string }; Returns: boolean }
      is_staff_only: { Args: { _tenant_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: { _tenant_id: string }; Returns: boolean }
      is_tenant_staff: { Args: { _tenant_id: string }; Returns: boolean }
      record_order_rate_limit: {
        Args: { p_table_id: string }
        Returns: undefined
      }
      record_password_reset_attempt: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      resolve_qr_token: {
        Args: { p_qr_token: string }
        Returns: {
          active: boolean
          id: string
          label: string
          venue_id: string
        }[]
      }
      validate_invitation_token: {
        Args: { p_token_hash: string }
        Returns: {
          email: string
          invitation_id: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          venue_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "completed"
        | "cancelled"
        | "pending_payment"
        | "cash_on_delivery"
        | "expired"
      payment_method: "bank_transfer" | "cash"
      tenant_role: "tenant_admin" | "staff"
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
      app_role: ["admin", "staff"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "completed",
        "cancelled",
        "pending_payment",
        "cash_on_delivery",
        "expired",
      ],
      payment_method: ["bank_transfer", "cash"],
      tenant_role: ["tenant_admin", "staff"],
    },
  },
} as const
