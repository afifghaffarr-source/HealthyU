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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      fasting_sessions: {
        Row: {
          completed: boolean | null
          created_at: string
          end_time: string | null
          id: string
          notes: string | null
          protocol: string
          start_time: string
          target_hours: number
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          protocol?: string
          start_time?: string
          target_hours?: number
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          protocol?: string
          start_time?: string
          target_hours?: number
          user_id?: string
        }
        Relationships: []
      }
      food_items: {
        Row: {
          calories: number
          carbs_g: number | null
          category: string | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          id: string
          is_indonesian: boolean | null
          name: string
          name_en: string | null
          protein_g: number | null
          serving_size: number | null
          serving_unit: string | null
        }
        Insert: {
          calories: number
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          is_indonesian?: boolean | null
          name: string
          name_en?: string | null
          protein_g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
        }
        Update: {
          calories?: number
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          is_indonesian?: boolean | null
          name?: string
          name_en?: string | null
          protein_g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          calories: number
          carbs_g: number | null
          created_at: string
          custom_name: string | null
          fat_g: number | null
          food_item_id: string | null
          id: string
          logged_at: string
          meal_type: string
          protein_g: number | null
          serving_qty: number
          user_id: string
        }
        Insert: {
          calories: number
          carbs_g?: number | null
          created_at?: string
          custom_name?: string | null
          fat_g?: number | null
          food_item_id?: string | null
          id?: string
          logged_at?: string
          meal_type: string
          protein_g?: number | null
          serving_qty?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number | null
          created_at?: string
          custom_name?: string | null
          fat_g?: number | null
          food_item_id?: string | null
          id?: string
          logged_at?: string
          meal_type?: string
          protein_g?: number | null
          serving_qty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          allergies: string[] | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          daily_calorie_target: number | null
          dietary_preference: string | null
          full_name: string | null
          gender: string | null
          health_conditions: string[] | null
          height_cm: number | null
          id: string
          language: string | null
          onboarded: boolean
          target_weight_kg: number | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          allergies?: string[] | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          daily_calorie_target?: number | null
          dietary_preference?: string | null
          full_name?: string | null
          gender?: string | null
          health_conditions?: string[] | null
          height_cm?: number | null
          id: string
          language?: string | null
          onboarded?: boolean
          target_weight_kg?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          allergies?: string[] | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          daily_calorie_target?: number | null
          dietary_preference?: string | null
          full_name?: string | null
          gender?: string | null
          health_conditions?: string[] | null
          height_cm?: number | null
          id?: string
          language?: string | null
          onboarded?: boolean
          target_weight_kg?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          id: string
          logged_at: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          id?: string
          logged_at?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          id?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
