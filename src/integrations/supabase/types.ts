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
      body_metrics: {
        Row: {
          bicep_left_cm: number | null
          bicep_right_cm: number | null
          blood_oxygen_pct: number | null
          blood_pressure_dia: number | null
          blood_pressure_sys: number | null
          blood_sugar_mg_dl: number | null
          bmi: number | null
          bmi_category: string | null
          body_fat_pct: number | null
          body_temperature_c: number | null
          bone_mass_kg: number | null
          calf_cm: number | null
          chest_cm: number | null
          created_at: string
          heart_rate_bpm: number | null
          hip_cm: number | null
          id: string
          measure_date: string | null
          measured_at: string
          muscle_mass_kg: number | null
          neck_cm: number | null
          notes: string | null
          source: string | null
          thigh_left_cm: number | null
          thigh_right_cm: number | null
          updated_at: string
          user_id: string
          visceral_fat: number | null
          waist_cm: number | null
          water_pct: number | null
          weight_kg: number | null
        }
        Insert: {
          bicep_left_cm?: number | null
          bicep_right_cm?: number | null
          blood_oxygen_pct?: number | null
          blood_pressure_dia?: number | null
          blood_pressure_sys?: number | null
          blood_sugar_mg_dl?: number | null
          bmi?: number | null
          bmi_category?: string | null
          body_fat_pct?: number | null
          body_temperature_c?: number | null
          bone_mass_kg?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          heart_rate_bpm?: number | null
          hip_cm?: number | null
          id?: string
          measure_date?: string | null
          measured_at?: string
          muscle_mass_kg?: number | null
          neck_cm?: number | null
          notes?: string | null
          source?: string | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          updated_at?: string
          user_id: string
          visceral_fat?: number | null
          waist_cm?: number | null
          water_pct?: number | null
          weight_kg?: number | null
        }
        Update: {
          bicep_left_cm?: number | null
          bicep_right_cm?: number | null
          blood_oxygen_pct?: number | null
          blood_pressure_dia?: number | null
          blood_pressure_sys?: number | null
          blood_sugar_mg_dl?: number | null
          bmi?: number | null
          bmi_category?: string | null
          body_fat_pct?: number | null
          body_temperature_c?: number | null
          bone_mass_kg?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          heart_rate_bpm?: number | null
          hip_cm?: number | null
          id?: string
          measure_date?: string | null
          measured_at?: string
          muscle_mass_kg?: number | null
          neck_cm?: number | null
          notes?: string | null
          source?: string | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          updated_at?: string
          user_id?: string
          visceral_fat?: number | null
          waist_cm?: number | null
          water_pct?: number | null
          weight_kg?: number | null
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
          active_minutes: number | null
          calories_burned: number | null
          created_at: string
          day: string
          distance_km: number | null
          floors_climbed: number | null
          id: string
          source: string
          steps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_minutes?: number | null
          calories_burned?: number | null
          created_at?: string
          day: string
          distance_km?: number | null
          floors_climbed?: number | null
          id?: string
          source?: string
          steps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_minutes?: number | null
          calories_burned?: number | null
          created_at?: string
          day?: string
          distance_km?: number | null
          floors_climbed?: number | null
          id?: string
          source?: string
          steps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          calories_10min: number | null
          calories_15min: number | null
          calories_30min: number | null
          calories_5min: number | null
          calories_burned_per_min: number | null
          category: string
          contraindications: Json | null
          created_at: string
          default_duration_sec: number | null
          default_reps: number | null
          default_rest_sec: number | null
          default_sets: number | null
          deleted_at: string | null
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          easier_variation_id: string | null
          equipment: Json | null
          harder_variation_id: string | null
          id: string
          image_url: string | null
          instructions: Json | null
          is_active: boolean
          met_value: number | null
          name: string
          name_en: string | null
          primary_muscles: Json | null
          safety_tips: Json | null
          secondary_muscles: Json | null
          slug: string | null
          subcategory: string | null
          times_performed: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          calories_10min?: number | null
          calories_15min?: number | null
          calories_30min?: number | null
          calories_5min?: number | null
          calories_burned_per_min?: number | null
          category: string
          contraindications?: Json | null
          created_at?: string
          default_duration_sec?: number | null
          default_reps?: number | null
          default_rest_sec?: number | null
          default_sets?: number | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          easier_variation_id?: string | null
          equipment?: Json | null
          harder_variation_id?: string | null
          id?: string
          image_url?: string | null
          instructions?: Json | null
          is_active?: boolean
          met_value?: number | null
          name: string
          name_en?: string | null
          primary_muscles?: Json | null
          safety_tips?: Json | null
          secondary_muscles?: Json | null
          slug?: string | null
          subcategory?: string | null
          times_performed?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          calories_10min?: number | null
          calories_15min?: number | null
          calories_30min?: number | null
          calories_5min?: number | null
          calories_burned_per_min?: number | null
          category?: string
          contraindications?: Json | null
          created_at?: string
          default_duration_sec?: number | null
          default_reps?: number | null
          default_rest_sec?: number | null
          default_sets?: number | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          easier_variation_id?: string | null
          equipment?: Json | null
          harder_variation_id?: string | null
          id?: string
          image_url?: string | null
          instructions?: Json | null
          is_active?: boolean
          met_value?: number | null
          name?: string
          name_en?: string | null
          primary_muscles?: Json | null
          safety_tips?: Json | null
          secondary_muscles?: Json | null
          slug?: string | null
          subcategory?: string | null
          times_performed?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      fasting_schedules: {
        Row: {
          created_at: string
          eating_window_end: string | null
          eating_window_start: string | null
          enabled_days: Json | null
          fasting_type: string
          id: string
          is_active: boolean
          is_ramadhan_mode: boolean
          target_duration_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eating_window_end?: string | null
          eating_window_start?: string | null
          enabled_days?: Json | null
          fasting_type: string
          id?: string
          is_active?: boolean
          is_ramadhan_mode?: boolean
          target_duration_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          eating_window_end?: string | null
          eating_window_start?: string | null
          enabled_days?: Json | null
          fasting_type?: string
          id?: string
          is_active?: boolean
          is_ramadhan_mode?: boolean
          target_duration_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fasting_sessions: {
        Row: {
          actual_duration_hours: number | null
          break_reason: string | null
          completed: boolean | null
          created_at: string
          end_time: string | null
          energy_level_end: number | null
          energy_level_start: number | null
          hunger_level_avg: number | null
          id: string
          iftar_logged: boolean | null
          iftar_time: string | null
          imsak_time: string | null
          mood_during: number | null
          notes: string | null
          planned_duration_hours: number | null
          planned_end_at: string | null
          protocol: string
          sahur_logged: boolean | null
          start_time: string
          status: string | null
          target_hours: number
          updated_at: string
          user_id: string
          water_intake_ml: number | null
        }
        Insert: {
          actual_duration_hours?: number | null
          break_reason?: string | null
          completed?: boolean | null
          created_at?: string
          end_time?: string | null
          energy_level_end?: number | null
          energy_level_start?: number | null
          hunger_level_avg?: number | null
          id?: string
          iftar_logged?: boolean | null
          iftar_time?: string | null
          imsak_time?: string | null
          mood_during?: number | null
          notes?: string | null
          planned_duration_hours?: number | null
          planned_end_at?: string | null
          protocol?: string
          sahur_logged?: boolean | null
          start_time?: string
          status?: string | null
          target_hours?: number
          updated_at?: string
          user_id: string
          water_intake_ml?: number | null
        }
        Update: {
          actual_duration_hours?: number | null
          break_reason?: string | null
          completed?: boolean | null
          created_at?: string
          end_time?: string | null
          energy_level_end?: number | null
          energy_level_start?: number | null
          hunger_level_avg?: number | null
          id?: string
          iftar_logged?: boolean | null
          iftar_time?: string | null
          imsak_time?: string | null
          mood_during?: number | null
          notes?: string | null
          planned_duration_hours?: number | null
          planned_end_at?: string | null
          protocol?: string
          sahur_logged?: boolean | null
          start_time?: string
          status?: string | null
          target_hours?: number
          updated_at?: string
          user_id?: string
          water_intake_ml?: number | null
        }
        Relationships: []
      }
      food_alternatives: {
        Row: {
          alternative_food_id: string
          created_at: string
          food_id: string
          id: string
          reason: string | null
          similarity_score: number | null
        }
        Insert: {
          alternative_food_id: string
          created_at?: string
          food_id: string
          id?: string
          reason?: string | null
          similarity_score?: number | null
        }
        Update: {
          alternative_food_id?: string
          created_at?: string
          food_id?: string
          id?: string
          reason?: string | null
          similarity_score?: number | null
        }
        Relationships: []
      }
      food_items: {
        Row: {
          allergens: string[] | null
          barcode: string | null
          bpom_number: string | null
          brand: string | null
          calcium_mg: number | null
          calories: number
          carbs_g: number | null
          category: string | null
          cholesterol_mg: number | null
          common_portions: Json | null
          created_at: string
          cuisine: string | null
          data_confidence: number | null
          data_source: string | null
          deleted_at: string | null
          description: string | null
          fat_g: number | null
          fiber_g: number | null
          glycemic_index: number | null
          glycemic_load: number | null
          health_rating: number | null
          id: string
          image_url: string | null
          ingredients: Json | null
          iron_mg: number | null
          is_active: boolean
          is_diabetic_friendly: boolean | null
          is_gluten_free: boolean | null
          is_halal: boolean | null
          is_indonesian: boolean | null
          is_keto_friendly: boolean | null
          is_vegan: boolean | null
          is_vegetarian: boolean | null
          is_verified: boolean
          ml_class_id: string | null
          name: string
          name_en: string | null
          popularity_score: number | null
          potassium_mg: number | null
          protein_g: number | null
          region: string | null
          sat_fat_g: number | null
          serving_size: number | null
          serving_unit: string | null
          slug: string | null
          sodium_mg: number | null
          subcategory: string | null
          sugar_g: number | null
          tags: string[] | null
          times_logged: number
          trans_fat_g: number | null
          updated_at: string
          vitamin_a_mcg: number | null
          vitamin_c_mg: number | null
          vitamin_d_mcg: number | null
        }
        Insert: {
          allergens?: string[] | null
          barcode?: string | null
          bpom_number?: string | null
          brand?: string | null
          calcium_mg?: number | null
          calories: number
          carbs_g?: number | null
          category?: string | null
          cholesterol_mg?: number | null
          common_portions?: Json | null
          created_at?: string
          cuisine?: string | null
          data_confidence?: number | null
          data_source?: string | null
          deleted_at?: string | null
          description?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          glycemic_index?: number | null
          glycemic_load?: number | null
          health_rating?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          iron_mg?: number | null
          is_active?: boolean
          is_diabetic_friendly?: boolean | null
          is_gluten_free?: boolean | null
          is_halal?: boolean | null
          is_indonesian?: boolean | null
          is_keto_friendly?: boolean | null
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          is_verified?: boolean
          ml_class_id?: string | null
          name: string
          name_en?: string | null
          popularity_score?: number | null
          potassium_mg?: number | null
          protein_g?: number | null
          region?: string | null
          sat_fat_g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          slug?: string | null
          sodium_mg?: number | null
          subcategory?: string | null
          sugar_g?: number | null
          tags?: string[] | null
          times_logged?: number
          trans_fat_g?: number | null
          updated_at?: string
          vitamin_a_mcg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
        }
        Update: {
          allergens?: string[] | null
          barcode?: string | null
          bpom_number?: string | null
          brand?: string | null
          calcium_mg?: number | null
          calories?: number
          carbs_g?: number | null
          category?: string | null
          cholesterol_mg?: number | null
          common_portions?: Json | null
          created_at?: string
          cuisine?: string | null
          data_confidence?: number | null
          data_source?: string | null
          deleted_at?: string | null
          description?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          glycemic_index?: number | null
          glycemic_load?: number | null
          health_rating?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          iron_mg?: number | null
          is_active?: boolean
          is_diabetic_friendly?: boolean | null
          is_gluten_free?: boolean | null
          is_halal?: boolean | null
          is_indonesian?: boolean | null
          is_keto_friendly?: boolean | null
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          is_verified?: boolean
          ml_class_id?: string | null
          name?: string
          name_en?: string | null
          popularity_score?: number | null
          potassium_mg?: number | null
          protein_g?: number | null
          region?: string | null
          sat_fat_g?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          slug?: string | null
          sodium_mg?: number | null
          subcategory?: string | null
          sugar_g?: number | null
          tags?: string[] | null
          times_logged?: number
          trans_fat_g?: number | null
          updated_at?: string
          vitamin_a_mcg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
        }
        Relationships: []
      }
      food_scans: {
        Row: {
          avg_confidence: number | null
          created_at: string
          detected_foods: Json | null
          id: string
          image_url: string | null
          meal_log_id: string | null
          model_version: string | null
          processing_time_ms: number | null
          total_calories: number | null
          total_carbs: number | null
          total_fat: number | null
          total_protein: number | null
          user_id: string
          was_accurate: boolean | null
          was_logged: boolean
        }
        Insert: {
          avg_confidence?: number | null
          created_at?: string
          detected_foods?: Json | null
          id?: string
          image_url?: string | null
          meal_log_id?: string | null
          model_version?: string | null
          processing_time_ms?: number | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          user_id: string
          was_accurate?: boolean | null
          was_logged?: boolean
        }
        Update: {
          avg_confidence?: number | null
          created_at?: string
          detected_foods?: Json | null
          id?: string
          image_url?: string | null
          meal_log_id?: string | null
          model_version?: string | null
          processing_time_ms?: number | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          user_id?: string
          was_accurate?: boolean | null
          was_logged?: boolean
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
      meal_log_items: {
        Row: {
          calories: number
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          food_item_id: string | null
          food_name: string
          id: string
          meal_log_id: string
          notes: string | null
          photo_url: string | null
          protein_g: number | null
          serving_qty: number
          serving_size_g: number | null
          serving_unit: string | null
          sodium_mg: number | null
          source: string | null
          sugar_g: number | null
          updated_at: string
        }
        Insert: {
          calories?: number
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          food_item_id?: string | null
          food_name: string
          id?: string
          meal_log_id: string
          notes?: string | null
          photo_url?: string | null
          protein_g?: number | null
          serving_qty?: number
          serving_size_g?: number | null
          serving_unit?: string | null
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
          updated_at?: string
        }
        Update: {
          calories?: number
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          food_item_id?: string | null
          food_name?: string
          id?: string
          meal_log_id?: string
          notes?: string | null
          photo_url?: string | null
          protein_g?: number | null
          serving_qty?: number
          serving_size_g?: number | null
          serving_unit?: string | null
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_log_items_meal_log_id_fkey"
            columns: ["meal_log_id"]
            isOneToOne: false
            referencedRelation: "meal_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          calories: number
          carbs_g: number | null
          created_at: string
          custom_name: string | null
          deleted_at: string | null
          fat_g: number | null
          fiber_g: number | null
          food_item_id: string | null
          hunger_level_after: number | null
          hunger_level_before: number | null
          id: string
          location_name: string | null
          log_date: string | null
          logged_at: string
          meal_type: string
          mood_after: number | null
          mood_before: number | null
          notes: string | null
          photo_url: string | null
          protein_g: number | null
          serving_qty: number
          sodium_mg: number | null
          source: string | null
          sugar_g: number | null
          user_id: string
        }
        Insert: {
          calories: number
          carbs_g?: number | null
          created_at?: string
          custom_name?: string | null
          deleted_at?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          food_item_id?: string | null
          hunger_level_after?: number | null
          hunger_level_before?: number | null
          id?: string
          location_name?: string | null
          log_date?: string | null
          logged_at?: string
          meal_type: string
          mood_after?: number | null
          mood_before?: number | null
          notes?: string | null
          photo_url?: string | null
          protein_g?: number | null
          serving_qty?: number
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number | null
          created_at?: string
          custom_name?: string | null
          deleted_at?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          food_item_id?: string | null
          hunger_level_after?: number | null
          hunger_level_before?: number | null
          id?: string
          location_name?: string | null
          log_date?: string | null
          logged_at?: string
          meal_type?: string
          mood_after?: number | null
          mood_before?: number | null
          notes?: string | null
          photo_url?: string | null
          protein_g?: number | null
          serving_qty?: number
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
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
      meal_plan_items: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          estimated_cost_idr: number | null
          fat_g: number | null
          food_item_id: string | null
          food_name: string | null
          id: string
          is_logged: boolean
          logged_at: string | null
          meal_plan_id: string
          meal_type: string
          plan_date: string
          planned_time: string | null
          protein_g: number | null
          recipe_id: string | null
          serving_qty: number | null
          serving_unit: string | null
          updated_at: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          estimated_cost_idr?: number | null
          fat_g?: number | null
          food_item_id?: string | null
          food_name?: string | null
          id?: string
          is_logged?: boolean
          logged_at?: string | null
          meal_plan_id: string
          meal_type: string
          plan_date: string
          planned_time?: string | null
          protein_g?: number | null
          recipe_id?: string | null
          serving_qty?: number | null
          serving_unit?: string | null
          updated_at?: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          estimated_cost_idr?: number | null
          fat_g?: number | null
          food_item_id?: string | null
          food_name?: string | null
          id?: string
          is_logged?: boolean
          logged_at?: string | null
          meal_plan_id?: string
          meal_type?: string
          plan_date?: string
          planned_time?: string | null
          protein_g?: number | null
          recipe_id?: string | null
          serving_qty?: number | null
          serving_unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          calories: number
          created_at: string
          custom_name: string | null
          daily_budget_idr: number | null
          deleted_at: string | null
          diet_preference: string | null
          eating_window_end: string | null
          eating_window_start: string | null
          end_date: string | null
          exclude_allergens: Json | null
          fasting_enabled: boolean | null
          fasting_type: string | null
          food_item_id: string | null
          generated_by: string | null
          id: string
          is_active: boolean
          meal_count_per_day: number | null
          meal_type: string
          plan_date: string
          plan_name: string | null
          plan_type: string | null
          planned_qty: number
          start_date: string | null
          target_calories: number | null
          target_carbs: number | null
          target_fat: number | null
          target_protein: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          created_at?: string
          custom_name?: string | null
          daily_budget_idr?: number | null
          deleted_at?: string | null
          diet_preference?: string | null
          eating_window_end?: string | null
          eating_window_start?: string | null
          end_date?: string | null
          exclude_allergens?: Json | null
          fasting_enabled?: boolean | null
          fasting_type?: string | null
          food_item_id?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean
          meal_count_per_day?: number | null
          meal_type: string
          plan_date: string
          plan_name?: string | null
          plan_type?: string | null
          planned_qty?: number
          start_date?: string | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          target_protein?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          created_at?: string
          custom_name?: string | null
          daily_budget_idr?: number | null
          deleted_at?: string | null
          diet_preference?: string | null
          eating_window_end?: string | null
          eating_window_start?: string | null
          end_date?: string | null
          exclude_allergens?: Json | null
          fasting_enabled?: boolean | null
          fasting_type?: string | null
          food_item_id?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean
          meal_count_per_day?: number | null
          meal_type?: string
          plan_date?: string
          plan_name?: string | null
          plan_type?: string | null
          planned_qty?: number
          start_date?: string | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          target_protein?: number | null
          updated_at?: string
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
      recipe_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          recipe_id: string
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          recipe_id: string
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          recipe_id?: string
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ratings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          avg_rating: number
          calories: number
          carbs_g: number
          category: string
          cook_count: number
          created_at: string
          cuisine: string | null
          deleted_at: string | null
          description: string | null
          difficulty: string | null
          estimated_cost_idr: number | null
          fat_g: number
          fiber_g: number | null
          id: string
          image_url: string | null
          ingredients: string[]
          instructions: string[]
          is_featured: boolean
          is_halal: boolean | null
          is_indonesian: boolean
          is_keto_friendly: boolean | null
          is_published: boolean
          is_vegan: boolean | null
          is_vegetarian: boolean | null
          prep_min: number
          protein_g: number
          rating_count: number
          save_count: number
          servings: number
          slug: string | null
          tags: Json | null
          title: string
          updated_at: string
          user_id: string | null
          video_url: string | null
          view_count: number
        }
        Insert: {
          avg_rating?: number
          calories?: number
          carbs_g?: number
          category?: string
          cook_count?: number
          created_at?: string
          cuisine?: string | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_cost_idr?: number | null
          fat_g?: number
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string[]
          instructions?: string[]
          is_featured?: boolean
          is_halal?: boolean | null
          is_indonesian?: boolean
          is_keto_friendly?: boolean | null
          is_published?: boolean
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          prep_min?: number
          protein_g?: number
          rating_count?: number
          save_count?: number
          servings?: number
          slug?: string | null
          tags?: Json | null
          title: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          view_count?: number
        }
        Update: {
          avg_rating?: number
          calories?: number
          carbs_g?: number
          category?: string
          cook_count?: number
          created_at?: string
          cuisine?: string | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_cost_idr?: number | null
          fat_g?: number
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string[]
          instructions?: string[]
          is_featured?: boolean
          is_halal?: boolean | null
          is_indonesian?: boolean
          is_keto_friendly?: boolean | null
          is_published?: boolean
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          prep_min?: number
          protein_g?: number
          rating_count?: number
          save_count?: number
          servings?: number
          slug?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          view_count?: number
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
      workout_log_items: {
        Row: {
          calories_burned: number | null
          created_at: string
          distance_km: number | null
          duration_sec: number | null
          exercise_id: string | null
          exercise_name: string
          exercise_order: number
          heart_rate_avg: number | null
          heart_rate_max: number | null
          id: string
          notes: string | null
          reps_per_set: Json | null
          sets_completed: number | null
          updated_at: string
          weight_kg: number | null
          workout_log_id: string
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string
          distance_km?: number | null
          duration_sec?: number | null
          exercise_id?: string | null
          exercise_name: string
          exercise_order?: number
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          id?: string
          notes?: string | null
          reps_per_set?: Json | null
          sets_completed?: number | null
          updated_at?: string
          weight_kg?: number | null
          workout_log_id: string
        }
        Update: {
          calories_burned?: number | null
          created_at?: string
          distance_km?: number | null
          duration_sec?: number | null
          exercise_id?: string | null
          exercise_name?: string
          exercise_order?: number
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          id?: string
          notes?: string | null
          reps_per_set?: Json | null
          sets_completed?: number | null
          updated_at?: string
          weight_kg?: number | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_log_items_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_items: {
        Row: {
          completed_at: string | null
          created_at: string
          day_of_week: number | null
          duration_sec: number | null
          exercise_id: string | null
          exercise_name: string
          exercise_order: number
          exercise_type: string | null
          id: string
          is_completed: boolean
          plan_date: string | null
          reps: number | null
          rest_after_sec: number | null
          rest_between_sets_sec: number | null
          sets: number | null
          updated_at: string
          weight_kg: number | null
          workout_plan_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_of_week?: number | null
          duration_sec?: number | null
          exercise_id?: string | null
          exercise_name: string
          exercise_order?: number
          exercise_type?: string | null
          id?: string
          is_completed?: boolean
          plan_date?: string | null
          reps?: number | null
          rest_after_sec?: number | null
          rest_between_sets_sec?: number | null
          sets?: number | null
          updated_at?: string
          weight_kg?: number | null
          workout_plan_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_of_week?: number | null
          duration_sec?: number | null
          exercise_id?: string | null
          exercise_name?: string
          exercise_order?: number
          exercise_type?: string | null
          id?: string
          is_completed?: boolean
          plan_date?: string | null
          reps?: number | null
          rest_after_sec?: number | null
          rest_between_sets_sec?: number | null
          sets?: number | null
          updated_at?: string
          weight_kg?: number | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_items_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          available_equipment: Json | null
          created_at: string
          deleted_at: string | null
          difficulty: string | null
          end_date: string | null
          focus_areas: Json | null
          generated_by: string | null
          id: string
          injuries: Json | null
          is_active: boolean
          plan_name: string
          plan_type: string | null
          start_date: string | null
          target_calories: number | null
          target_days_per_week: number | null
          target_duration_min: number | null
          updated_at: string
          user_id: string
          workout_types: Json | null
        }
        Insert: {
          available_equipment?: Json | null
          created_at?: string
          deleted_at?: string | null
          difficulty?: string | null
          end_date?: string | null
          focus_areas?: Json | null
          generated_by?: string | null
          id?: string
          injuries?: Json | null
          is_active?: boolean
          plan_name: string
          plan_type?: string | null
          start_date?: string | null
          target_calories?: number | null
          target_days_per_week?: number | null
          target_duration_min?: number | null
          updated_at?: string
          user_id: string
          workout_types?: Json | null
        }
        Update: {
          available_equipment?: Json | null
          created_at?: string
          deleted_at?: string | null
          difficulty?: string | null
          end_date?: string | null
          focus_areas?: Json | null
          generated_by?: string | null
          id?: string
          injuries?: Json | null
          is_active?: boolean
          plan_name?: string
          plan_type?: string | null
          start_date?: string | null
          target_calories?: number | null
          target_days_per_week?: number | null
          target_duration_min?: number | null
          updated_at?: string
          user_id?: string
          workout_types?: Json | null
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          calories_burned: number
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          difficulty_rating: number | null
          duration_min: number
          exercises_completed: number | null
          heart_rate_avg: number | null
          heart_rate_max: number | null
          heart_rate_min: number | null
          id: string
          intensity: string
          log_date: string | null
          mood_after: number | null
          mood_before: number | null
          name: string
          notes: string | null
          perceived_exertion: number | null
          performed_at: string
          source: string | null
          started_at: string | null
          total_reps: number | null
          total_sets: number | null
          type: string
          updated_at: string
          user_id: string
          workout_plan_id: string | null
        }
        Insert: {
          calories_burned?: number
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          difficulty_rating?: number | null
          duration_min: number
          exercises_completed?: number | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          heart_rate_min?: number | null
          id?: string
          intensity?: string
          log_date?: string | null
          mood_after?: number | null
          mood_before?: number | null
          name: string
          notes?: string | null
          perceived_exertion?: number | null
          performed_at?: string
          source?: string | null
          started_at?: string | null
          total_reps?: number | null
          total_sets?: number | null
          type: string
          updated_at?: string
          user_id: string
          workout_plan_id?: string | null
        }
        Update: {
          calories_burned?: number
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          difficulty_rating?: number | null
          duration_min?: number
          exercises_completed?: number | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          heart_rate_min?: number | null
          id?: string
          intensity?: string
          log_date?: string | null
          mood_after?: number | null
          mood_before?: number | null
          name?: string
          notes?: string | null
          perceived_exertion?: number | null
          performed_at?: string
          source?: string | null
          started_at?: string | null
          total_reps?: number | null
          total_sets?: number | null
          type?: string
          updated_at?: string
          user_id?: string
          workout_plan_id?: string | null
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
