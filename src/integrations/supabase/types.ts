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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bills: {
        Row: {
          amount_rial: number
          bill_number: string
          created_at: string
          id: string
          mid_kwh: number
          offpeak_kwh: number
          peak_kwh: number
          period_label: string
          user_id: string
        }
        Insert: {
          amount_rial?: number
          bill_number: string
          created_at?: string
          id?: string
          mid_kwh?: number
          offpeak_kwh?: number
          peak_kwh?: number
          period_label: string
          user_id: string
        }
        Update: {
          amount_rial?: number
          bill_number?: string
          created_at?: string
          id?: string
          mid_kwh?: number
          offpeak_kwh?: number
          peak_kwh?: number
          period_label?: string
          user_id?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          granted_at: string
          id: string
          partner: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          partner: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          partner?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      plants: {
        Row: {
          annual_kwh: number
          capacity_kw: number
          channel: string | null
          city: string
          contract_signed_at: string | null
          contract_version: string | null
          created_at: string
          dongle_id: string | null
          has_battery: boolean
          id: string
          inverter: string
          inverter_serial: string | null
          loan_amount_rial: number | null
          loan_months: number | null
          name: string
          orientation: string
          panel_count: number
          panel_watt: number
          quote_rial: number | null
          roof_area_m2: number
          stage: number
          supplier: string | null
          tracking_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_kwh: number
          capacity_kw: number
          channel?: string | null
          city?: string
          contract_signed_at?: string | null
          contract_version?: string | null
          created_at?: string
          dongle_id?: string | null
          has_battery?: boolean
          id?: string
          inverter: string
          inverter_serial?: string | null
          loan_amount_rial?: number | null
          loan_months?: number | null
          name?: string
          orientation?: string
          panel_count: number
          panel_watt?: number
          quote_rial?: number | null
          roof_area_m2: number
          stage?: number
          supplier?: string | null
          tracking_code?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_kwh?: number
          capacity_kw?: number
          channel?: string | null
          city?: string
          contract_signed_at?: string | null
          contract_version?: string | null
          created_at?: string
          dongle_id?: string | null
          has_battery?: boolean
          id?: string
          inverter?: string
          inverter_serial?: string | null
          loan_amount_rial?: number | null
          loan_months?: number | null
          name?: string
          orientation?: string
          panel_count?: number
          panel_watt?: number
          quote_rial?: number | null
          roof_area_m2?: number
          stage?: number
          supplier?: string | null
          tracking_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_holder: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          full_name: string | null
          iban: string | null
          id: string
          kyc_submitted_at: string | null
          national_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          iban?: string | null
          id: string
          kyc_submitted_at?: string | null
          national_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          iban?: string | null
          id?: string
          kyc_submitted_at?: string | null
          national_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_table: {
        Row: {
          active: boolean
          channel: string
          condition: string | null
          contract_years: number
          created_at: string
          id: string
          rate_rial_per_kwh: number
          settlement_delay: string | null
          sort_order: number
          title: string
          version: string
        }
        Insert: {
          active?: boolean
          channel: string
          condition?: string | null
          contract_years: number
          created_at?: string
          id?: string
          rate_rial_per_kwh: number
          settlement_delay?: string | null
          sort_order?: number
          title: string
          version: string
        }
        Update: {
          active?: boolean
          channel?: string
          condition?: string | null
          contract_years?: number
          created_at?: string
          id?: string
          rate_rial_per_kwh?: number
          settlement_delay?: string | null
          sort_order?: number
          title?: string
          version?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          amount_rial: number
          created_at: string
          dispute_note: string | null
          energy_kwh: number
          id: string
          inverter_kwh: number
          period_label: string
          plant_id: string
          rate_rial: number
          status: string
          user_id: string
        }
        Insert: {
          amount_rial: number
          created_at?: string
          dispute_note?: string | null
          energy_kwh: number
          id?: string
          inverter_kwh: number
          period_label: string
          plant_id: string
          rate_rial: number
          status?: string
          user_id: string
        }
        Update: {
          amount_rial?: number
          created_at?: string
          dispute_note?: string | null
          energy_kwh?: number
          id?: string
          inverter_kwh?: number
          period_label?: string
          plant_id?: string
          rate_rial?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          description: string
          id: string
          plant_id: string | null
          status: string
          subject: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          plant_id?: string | null
          status?: string
          subject: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          plant_id?: string | null
          status?: string
          subject?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          created_at: string
          id: string
          kind: string
          note: string | null
          plant_id: string
          preferred_date: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          plant_id: string
          preferred_date?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          plant_id?: string
          preferred_date?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
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
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
