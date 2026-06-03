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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          title: string
          xp_reward: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id: string
          title: string
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
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
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_steps: {
        Row: {
          created_at: string
          day: string
          id: string
          source: string
          steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          source?: string
          steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          source?: string
          steps?: number
          updated_at?: string
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
          allergens: string[] | null
          calories: number
          carbs_g: number | null
          category: string | null
          created_at: string
          data_confidence: number | null
          data_source: string | null
          fat_g: number | null
          fiber_g: number | null
          glycemic_index: number | null
          id: string
          image_url: string | null
          is_indonesian: boolean | null
          name: string
          name_en: string | null
          popularity_score: number | null
          protein_g: number | null
          region: string | null
          serving_size: number | null
          serving_unit: string | null
          sodium_mg: number | null
          subcategory: string | null
          sugar_g: number | null
          tags: string[] | null
        }
        Insert: {
          allergens?: string[] | null
          calories: number
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          data_confidence?: number | null
          data_source?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          glycemic_index?: number | null
          id?: string
          image_url?: string | null
          is_indonesian?: boolean | null
          name: string
          name_en?: string | null
          popularity_score?: number | null
          protein_g?: number | null
          region?: string | null
          serving_size?: number | null
          serving_unit?: string | null
          sodium_mg?: number | null
          subcategory?: string | null
          sugar_g?: number | null
          tags?: string[] | null
        }
        Update: {
          allergens?: string[] | null
          calories?: number
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          data_confidence?: number | null
          data_source?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          glycemic_index?: number | null
          id?: string
          image_url?: string | null
          is_indonesian?: boolean | null
          name?: string
          name_en?: string | null
          popularity_score?: number | null
          protein_g?: number | null
          region?: string | null
          serving_size?: number | null
          serving_unit?: string | null
          sodium_mg?: number | null
          subcategory?: string | null
          sugar_g?: number | null
          tags?: string[] | null
        }
        Relationships: []
      }
      food_serving_sizes: {
        Row: {
          created_at: string
          food_item_id: string
          grams: number
          id: string
          is_default: boolean
          label: string
        }
        Insert: {
          created_at?: string
          food_item_id: string
          grams: number
          id?: string
          is_default?: boolean
          label: string
        }
        Update: {
          created_at?: string
          food_item_id?: string
          grams?: number
          id?: string
          is_default?: boolean
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_serving_sizes_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_groups: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
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
      meal_plans: {
        Row: {
          calories: number
          created_at: string
          custom_name: string | null
          food_item_id: string | null
          id: string
          meal_type: string
          plan_date: string
          planned_qty: number
          user_id: string
        }
        Insert: {
          calories?: number
          created_at?: string
          custom_name?: string | null
          food_item_id?: string | null
          id?: string
          meal_type: string
          plan_date: string
          planned_qty?: number
          user_id: string
        }
        Update: {
          calories?: number
          created_at?: string
          custom_name?: string | null
          food_item_id?: string | null
          id?: string
          meal_type?: string
          plan_date?: string
          planned_qty?: number
          user_id?: string
        }
        Relationships: []
      }
      medication_logs: {
        Row: {
          id: string
          medication_id: string
          scheduled_date: string
          scheduled_time: string
          taken_at: string
          user_id: string
        }
        Insert: {
          id?: string
          medication_id: string
          scheduled_date?: string
          scheduled_time: string
          taken_at?: string
          user_id: string
        }
        Update: {
          id?: string
          medication_id?: string
          scheduled_date?: string
          scheduled_time?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          created_at: string
          dose: string | null
          end_date: string | null
          frequency: string
          id: string
          name: string
          notes: string | null
          start_date: string
          times: string[]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          dose?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          name: string
          notes?: string | null
          start_date?: string
          times?: string[]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          dose?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          name?: string
          notes?: string | null
          start_date?: string
          times?: string[]
          user_id?: string
        }
        Relationships: []
      }
      mood_logs: {
        Row: {
          id: string
          logged_at: string
          mood: number
          note: string | null
          user_id: string
        }
        Insert: {
          id?: string
          logged_at?: string
          mood: number
          note?: string | null
          user_id: string
        }
        Update: {
          id?: string
          logged_at?: string
          mood?: number
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          allergies: string[] | null
          avatar_url: string | null
          birth_date: string | null
          blood_type: string | null
          bmi: number | null
          bmi_category: string | null
          bmr: number | null
          city: string | null
          created_at: string
          daily_calorie_target: number | null
          daily_carbs_target: number | null
          daily_fat_target: number | null
          daily_fiber_target: number | null
          daily_protein_target: number | null
          daily_steps_target: number | null
          daily_water_target: number | null
          deleted_at: string | null
          dietary_preference: string | null
          fcm_token: string | null
          full_name: string | null
          gender: string | null
          health_age: number | null
          health_coins: number
          health_conditions: string[] | null
          health_score: number | null
          height_cm: number | null
          id: string
          ideal_weight_max: number | null
          ideal_weight_min: number | null
          language: string | null
          location_lat: number | null
          location_lng: number | null
          location_province: string | null
          onboarded: boolean
          phone: string | null
          platform: string | null
          premium_expires_at: string | null
          premium_status: string
          referral_code: string | null
          referred_by: string | null
          streak_days: number
          target_weight_kg: number | null
          tdee: number | null
          theme: string | null
          timezone: string | null
          total_xp: number
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          allergies?: string[] | null
          avatar_url?: string | null
          birth_date?: string | null
          blood_type?: string | null
          bmi?: number | null
          bmi_category?: string | null
          bmr?: number | null
          city?: string | null
          created_at?: string
          daily_calorie_target?: number | null
          daily_carbs_target?: number | null
          daily_fat_target?: number | null
          daily_fiber_target?: number | null
          daily_protein_target?: number | null
          daily_steps_target?: number | null
          daily_water_target?: number | null
          deleted_at?: string | null
          dietary_preference?: string | null
          fcm_token?: string | null
          full_name?: string | null
          gender?: string | null
          health_age?: number | null
          health_coins?: number
          health_conditions?: string[] | null
          health_score?: number | null
          height_cm?: number | null
          id: string
          ideal_weight_max?: number | null
          ideal_weight_min?: number | null
          language?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_province?: string | null
          onboarded?: boolean
          phone?: string | null
          platform?: string | null
          premium_expires_at?: string | null
          premium_status?: string
          referral_code?: string | null
          referred_by?: string | null
          streak_days?: number
          target_weight_kg?: number | null
          tdee?: number | null
          theme?: string | null
          timezone?: string | null
          total_xp?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          allergies?: string[] | null
          avatar_url?: string | null
          birth_date?: string | null
          blood_type?: string | null
          bmi?: number | null
          bmi_category?: string | null
          bmr?: number | null
          city?: string | null
          created_at?: string
          daily_calorie_target?: number | null
          daily_carbs_target?: number | null
          daily_fat_target?: number | null
          daily_fiber_target?: number | null
          daily_protein_target?: number | null
          daily_steps_target?: number | null
          daily_water_target?: number | null
          deleted_at?: string | null
          dietary_preference?: string | null
          fcm_token?: string | null
          full_name?: string | null
          gender?: string | null
          health_age?: number | null
          health_coins?: number
          health_conditions?: string[] | null
          health_score?: number | null
          height_cm?: number | null
          id?: string
          ideal_weight_max?: number | null
          ideal_weight_min?: number | null
          language?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_province?: string | null
          onboarded?: boolean
          phone?: string | null
          platform?: string | null
          premium_expires_at?: string | null
          premium_status?: string
          referral_code?: string | null
          referred_by?: string | null
          streak_days?: number
          target_weight_kg?: number | null
          tdee?: number | null
          theme?: string | null
          timezone?: string | null
          total_xp?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          photo_url: string
          taken_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_url: string
          taken_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string
          taken_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          calories: number
          carbs_g: number
          category: string
          created_at: string
          description: string | null
          fat_g: number
          id: string
          ingredients: string[]
          instructions: string[]
          is_indonesian: boolean
          prep_min: number
          protein_g: number
          servings: number
          title: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          category?: string
          created_at?: string
          description?: string | null
          fat_g?: number
          id?: string
          ingredients?: string[]
          instructions?: string[]
          is_indonesian?: boolean
          prep_min?: number
          protein_g?: number
          servings?: number
          title: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          category?: string
          created_at?: string
          description?: string | null
          fat_g?: number
          id?: string
          ingredients?: string[]
          instructions?: string[]
          is_indonesian?: boolean
          prep_min?: number
          protein_g?: number
          servings?: number
          title?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          quality: number
          sleep_end: string
          sleep_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          quality?: number
          sleep_end: string
          sleep_start: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          quality?: number
          sleep_end?: string
          sleep_start?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_allergies: {
        Row: {
          allergen: string
          created_at: string
          id: string
          reaction: string | null
          severity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergen: string
          created_at?: string
          id?: string
          reaction?: string | null
          severity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergen?: string
          created_at?: string
          id?: string
          reaction?: string | null
          severity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_connected_accounts: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          metadata: Json | null
          provider: string
          provider_user_id: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          metadata?: Json | null
          provider: string
          provider_user_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          metadata?: Json | null
          provider?: string
          provider_user_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_health_conditions: {
        Row: {
          condition_name: string
          created_at: string
          diagnosed_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          severity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          condition_name: string
          created_at?: string
          diagnosed_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          severity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          condition_name?: string
          created_at?: string
          diagnosed_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          severity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          created_at: string
          current_streak: number
          last_activity_date: string | null
          level: number
          longest_streak: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      vitals_logs: {
        Row: {
          created_at: string
          diastolic: number | null
          glucose_mgdl: number | null
          glucose_state: string | null
          heart_rate: number | null
          id: string
          logged_at: string
          note: string | null
          systolic: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          diastolic?: number | null
          glucose_mgdl?: number | null
          glucose_state?: string | null
          heart_rate?: number | null
          id?: string
          logged_at?: string
          note?: string | null
          systolic?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          diastolic?: number | null
          glucose_mgdl?: number | null
          glucose_state?: string | null
          heart_rate?: number | null
          id?: string
          logged_at?: string
          note?: string | null
          systolic?: number | null
          user_id?: string
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
      wearable_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          last_sync_at: string | null
          provider: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          note: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          note?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          note?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          calories_burned: number
          created_at: string
          duration_min: number
          id: string
          intensity: string
          name: string
          notes: string | null
          performed_at: string
          type: string
          user_id: string
        }
        Insert: {
          calories_burned?: number
          created_at?: string
          duration_min: number
          id?: string
          intensity?: string
          name: string
          notes?: string | null
          performed_at?: string
          type: string
          user_id: string
        }
        Update: {
          calories_burned?: number
          created_at?: string
          duration_min?: number
          id?: string
          intensity?: string
          name?: string
          notes?: string | null
          performed_at?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
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
