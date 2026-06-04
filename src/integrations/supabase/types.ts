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
      account_deletion_requests: {
        Row: {
          id: string
          processed_at: string | null
          reason: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          processed_at?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      achievement_showcase_order: {
        Row: {
          achievement_id: string
          position: number
          user_id: string
        }
        Insert: {
          achievement_id: string
          position: number
          user_id: string
        }
        Update: {
          achievement_id?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          badge_url: string | null
          category: string
          coin_reward: number
          condition_metadata: Json | null
          condition_type: string | null
          condition_value: number | null
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          is_hidden: boolean
          name: string | null
          name_en: string | null
          rarity: string | null
          times_unlocked: number
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          badge_url?: string | null
          category?: string
          coin_reward?: number
          condition_metadata?: Json | null
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string
          description: string
          icon: string
          id: string
          is_active?: boolean
          is_hidden?: boolean
          name?: string | null
          name_en?: string | null
          rarity?: string | null
          times_unlocked?: number
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          badge_url?: string | null
          category?: string
          coin_reward?: number
          condition_metadata?: Json | null
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          name?: string | null
          name_en?: string | null
          rarity?: string | null
          times_unlocked?: number
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      ai_daily_challenges: {
        Row: {
          challenge_date: string
          completed: boolean
          created_at: string
          description: string | null
          goal_type: string | null
          goal_value: number | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          challenge_date?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          goal_type?: string | null
          goal_value?: number | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          challenge_date?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          goal_type?: string | null
          goal_value?: number | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_reports: {
        Row: {
          ai_model: string | null
          chart_data: Json | null
          concerns: Json | null
          correlation_insights: Json | null
          created_at: string
          health_score: number | null
          health_score_change: number | null
          highlights: Json | null
          id: string
          is_read: boolean
          prediction: string | null
          recommendations: Json | null
          report_period_end: string | null
          report_period_start: string | null
          report_type: string
          shared_with_doctor: boolean
          summary: Json | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          chart_data?: Json | null
          concerns?: Json | null
          correlation_insights?: Json | null
          created_at?: string
          health_score?: number | null
          health_score_change?: number | null
          highlights?: Json | null
          id?: string
          is_read?: boolean
          prediction?: string | null
          recommendations?: Json | null
          report_period_end?: string | null
          report_period_start?: string | null
          report_type: string
          shared_with_doctor?: boolean
          summary?: Json | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          chart_data?: Json | null
          concerns?: Json | null
          correlation_insights?: Json | null
          created_at?: string
          health_score?: number | null
          health_score_change?: number | null
          highlights?: Json | null
          id?: string
          is_read?: boolean
          prediction?: string | null
          recommendations?: Json | null
          report_period_end?: string | null
          report_period_start?: string | null
          report_type?: string
          shared_with_doctor?: boolean
          summary?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          created_at: string
          expires_at: string
          hit_count: number
          key: string
          model: string
          response: string
          tier: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          hit_count?: number
          key: string
          model: string
          response: string
          tier: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          hit_count?: number
          key?: string
          model?: string
          response?: string
          tier?: number
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          cache_hit: boolean
          completion_tokens: number | null
          cost_usd: number | null
          created_at: string
          feature: string
          id: string
          model: string | null
          prompt_tokens: number | null
          tier: number | null
          total_tokens: number | null
          user_id: string | null
          was_downgraded: boolean
        }
        Insert: {
          cache_hit?: boolean
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string
          feature: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          tier?: number | null
          total_tokens?: number | null
          user_id?: string | null
          was_downgraded?: boolean
        }
        Update: {
          cache_hit?: boolean
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string
          feature?: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          tier?: number | null
          total_tokens?: number | null
          user_id?: string | null
          was_downgraded?: boolean
        }
        Relationships: []
      }
      ai_weekly_reports: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
          week_start: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
          week_start: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          build_number: number | null
          created_at: string
          id: string
          is_active: boolean
          is_force_update: boolean
          min_supported_version: string | null
          platform: string
          release_notes: string | null
          version: string
        }
        Insert: {
          build_number?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_force_update?: boolean
          min_supported_version?: string | null
          platform: string
          release_notes?: string | null
          version: string
        }
        Update: {
          build_number?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_force_update?: boolean
          min_supported_version?: string | null
          platform?: string
          release_notes?: string | null
          version?: string
        }
        Relationships: []
      }
      article_bookmarks: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_bookmarks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          audio_url: string | null
          author_avatar_url: string | null
          author_name: string | null
          author_title: string | null
          author_user_id: string | null
          body_generated_at: string | null
          body_source: string
          bookmark_count: number
          category: string
          content: string | null
          content_html: string | null
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_original: boolean
          is_published: boolean
          keywords: Json | null
          language: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          reading_time_minutes: number | null
          share_count: number
          slug: string
          source_name: string | null
          source_url: string | null
          subcategory: string | null
          tags: Json | null
          target_conditions: Json | null
          target_goals: Json | null
          title: string
          title_en: string | null
          updated_at: string
          video_url: string | null
          view_count: number
        }
        Insert: {
          audio_url?: string | null
          author_avatar_url?: string | null
          author_name?: string | null
          author_title?: string | null
          author_user_id?: string | null
          body_generated_at?: string | null
          body_source?: string
          bookmark_count?: number
          category: string
          content?: string | null
          content_html?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_original?: boolean
          is_published?: boolean
          keywords?: Json | null
          language?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          share_count?: number
          slug: string
          source_name?: string | null
          source_url?: string | null
          subcategory?: string | null
          tags?: Json | null
          target_conditions?: Json | null
          target_goals?: Json | null
          title: string
          title_en?: string | null
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Update: {
          audio_url?: string | null
          author_avatar_url?: string | null
          author_name?: string | null
          author_title?: string | null
          author_user_id?: string | null
          body_generated_at?: string | null
          body_source?: string
          bookmark_count?: number
          category?: string
          content?: string | null
          content_html?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_original?: boolean
          is_published?: boolean
          keywords?: Json | null
          language?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          share_count?: number
          slug?: string
          source_name?: string | null
          source_url?: string | null
          subcategory?: string | null
          tags?: Json | null
          target_conditions?: Json | null
          target_goals?: Json | null
          title?: string
          title_en?: string | null
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: number
          ip_address: string | null
          meta: Json
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: number
          ip_address?: string | null
          meta?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: number
          ip_address?: string | null
          meta?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      barcode_cache: {
        Row: {
          allergens: string[] | null
          barcode: string
          brand: string | null
          calories_per_100g: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          product_name: string | null
          protein_g: number | null
          raw: Json | null
        }
        Insert: {
          allergens?: string[] | null
          barcode: string
          brand?: string | null
          calories_per_100g?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          product_name?: string | null
          protein_g?: number | null
          raw?: Json | null
        }
        Update: {
          allergens?: string[] | null
          barcode?: string
          brand?: string | null
          calories_per_100g?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          product_name?: string | null
          protein_g?: number | null
          raw?: Json | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
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
      budget_meal_plans: {
        Row: {
          budget_idr: number
          created_at: string
          days: number
          id: string
          plan: Json
          user_id: string
        }
        Insert: {
          budget_idr: number
          created_at?: string
          days: number
          id?: string
          plan: Json
          user_id: string
        }
        Update: {
          budget_idr?: number
          created_at?: string
          days?: number
          id?: string
          plan?: Json
          user_id?: string
        }
        Relationships: []
      }
      challenge_daily_logs: {
        Row: {
          challenge_participant_id: string
          completed: boolean
          created_at: string
          day_number: number
          id: string
          log_date: string
          notes: string | null
          proof_url: string | null
          target_logged: number | null
          value_logged: number | null
        }
        Insert: {
          challenge_participant_id: string
          completed?: boolean
          created_at?: string
          day_number: number
          id?: string
          log_date: string
          notes?: string | null
          proof_url?: string | null
          target_logged?: number | null
          value_logged?: number | null
        }
        Update: {
          challenge_participant_id?: string
          completed?: boolean
          created_at?: string
          day_number?: number
          id?: string
          log_date?: string
          notes?: string | null
          proof_url?: string | null
          target_logged?: number | null
          value_logged?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_daily_logs_challenge_participant_id_fkey"
            columns: ["challenge_participant_id"]
            isOneToOne: false
            referencedRelation: "challenge_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          coins_earned: number
          completed_at: string | null
          created_at: string
          current_day: number
          final_rank: number | null
          id: string
          joined_at: string
          progress_data: Json | null
          rewards_claimed: boolean
          status: string
          streak: number
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          challenge_id: string
          coins_earned?: number
          completed_at?: string | null
          created_at?: string
          current_day?: number
          final_rank?: number | null
          id?: string
          joined_at?: string
          progress_data?: Json | null
          rewards_claimed?: boolean
          status?: string
          streak?: number
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          challenge_id?: string
          coins_earned?: number
          completed_at?: string | null
          created_at?: string
          current_day?: number
          final_rank?: number | null
          id?: string
          joined_at?: string
          progress_data?: Json | null
          rewards_claimed?: boolean
          status?: string
          streak?: number
          updated_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          badge_url: string | null
          category: string | null
          challenge_type: string
          coin_reward: number
          created_at: string
          created_by: string | null
          current_participants: number
          description: string | null
          difficulty: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          max_participants: number | null
          rules: Json | null
          start_date: string | null
          status: string
          title: string
          title_en: string | null
          updated_at: string
          xp_reward: number
        }
        Insert: {
          badge_url?: string | null
          category?: string | null
          challenge_type: string
          coin_reward?: number
          created_at?: string
          created_by?: string | null
          current_participants?: number
          description?: string | null
          difficulty?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          max_participants?: number | null
          rules?: Json | null
          start_date?: string | null
          status?: string
          title: string
          title_en?: string | null
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          badge_url?: string | null
          category?: string | null
          challenge_type?: string
          coin_reward?: number
          created_at?: string
          created_by?: string | null
          current_participants?: number
          description?: string | null
          difficulty?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          max_participants?: number | null
          rules?: Json | null
          start_date?: string | null
          status?: string
          title?: string
          title_en?: string | null
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      charity_donations: {
        Row: {
          charity_name: string
          coins_spent: number
          donated_at: string
          id: string
          user_id: string
        }
        Insert: {
          charity_name: string
          coins_spent: number
          donated_at?: string
          id?: string
          user_id: string
        }
        Update: {
          charity_name?: string
          coins_spent?: number
          donated_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          audio_url: string | null
          contains_disclaimer: boolean | null
          content: string
          content_type: string | null
          context_used: Json | null
          created_at: string
          flag_reason: string | null
          id: string
          image_url: string | null
          is_accurate: boolean | null
          is_helpful: boolean | null
          model_used: string | null
          processing_time_ms: number | null
          rag_sources: Json | null
          role: string
          safety_score: number | null
          session_id: string | null
          suggestions: Json | null
          tokens_used: number | null
          transcription: string | null
          user_feedback: string | null
          user_id: string
          user_rating: number | null
          was_flagged: boolean
        }
        Insert: {
          audio_url?: string | null
          contains_disclaimer?: boolean | null
          content: string
          content_type?: string | null
          context_used?: Json | null
          created_at?: string
          flag_reason?: string | null
          id?: string
          image_url?: string | null
          is_accurate?: boolean | null
          is_helpful?: boolean | null
          model_used?: string | null
          processing_time_ms?: number | null
          rag_sources?: Json | null
          role: string
          safety_score?: number | null
          session_id?: string | null
          suggestions?: Json | null
          tokens_used?: number | null
          transcription?: string | null
          user_feedback?: string | null
          user_id: string
          user_rating?: number | null
          was_flagged?: boolean
        }
        Update: {
          audio_url?: string | null
          contains_disclaimer?: boolean | null
          content?: string
          content_type?: string | null
          context_used?: Json | null
          created_at?: string
          flag_reason?: string | null
          id?: string
          image_url?: string | null
          is_accurate?: boolean | null
          is_helpful?: boolean | null
          model_used?: string | null
          processing_time_ms?: number | null
          rag_sources?: Json | null
          role?: string
          safety_score?: number | null
          session_id?: string | null
          suggestions?: Json | null
          tokens_used?: number | null
          transcription?: string | null
          user_feedback?: string | null
          user_id?: string
          user_rating?: number | null
          was_flagged?: boolean
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          context_data: Json | null
          created_at: string
          id: string
          is_active: boolean
          last_message_at: string | null
          message_count: number
          title: string | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          message_count?: number
          title?: string | null
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          message_count?: number
          title?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_redemptions: {
        Row: {
          coins_spent: number
          created_at: string
          delivered_at: string | null
          delivery_data: Json | null
          delivery_status: string
          id: string
          redeemed_at: string
          reward_id: string
          user_id: string
        }
        Insert: {
          coins_spent: number
          created_at?: string
          delivered_at?: string | null
          delivery_data?: Json | null
          delivery_status?: string
          id?: string
          redeemed_at?: string
          reward_id: string
          user_id: string
        }
        Update: {
          coins_spent?: number
          created_at?: string
          delivered_at?: string | null
          delivery_data?: Json | null
          delivery_status?: string
          id?: string
          redeemed_at?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "coin_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_rewards: {
        Row: {
          category: string | null
          coin_cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          monetary_value_idr: number | null
          name: string
          partner_name: string | null
          remaining_stock: number | null
          total_stock: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          coin_cost: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          monetary_value_idr?: number | null
          name: string
          partner_name?: string | null
          remaining_stock?: number | null
          total_stock?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          coin_cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          monetary_value_idr?: number | null
          name?: string
          partner_name?: string | null
          remaining_stock?: number | null
          total_stock?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_flagged: boolean
          likes_count: number
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_flagged?: boolean
          likes_count?: number
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_flagged?: boolean
          likes_count?: number
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_groups: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_public: boolean
          member_count: number
          name: string
          tags: Json | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_public?: boolean
          member_count?: number
          name: string
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_public?: boolean
          member_count?: number
          name?: string
          tags?: Json | null
          updated_at?: string
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
          comments_count: number
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          image_urls: Json | null
          is_approved: boolean
          is_featured: boolean
          is_flagged: boolean
          is_pinned: boolean
          likes_count: number
          post_type: string | null
          shares_count: number
          tags: Json | null
          updated_at: string
          user_id: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          category?: string
          comments_count?: number
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_urls?: Json | null
          is_approved?: boolean
          is_featured?: boolean
          is_flagged?: boolean
          is_pinned?: boolean
          likes_count?: number
          post_type?: string | null
          shares_count?: number
          tags?: Json | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          category?: string
          comments_count?: number
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_urls?: Json | null
          is_approved?: boolean
          is_featured?: boolean
          is_flagged?: boolean
          is_pinned?: boolean
          likes_count?: number
          post_type?: string | null
          shares_count?: number
          tags?: Json | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: []
      }
      content_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name_en: string | null
          name_id: string
          parent_slug: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_id: string
          parent_slug?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_id?: string
          parent_slug?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_categories_parent_slug_fkey"
            columns: ["parent_slug"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      content_tags: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_en: string | null
          name_id: string
          slug: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_id: string
          slug: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_id?: string
          slug?: string
          usage_count?: number
        }
        Relationships: []
      }
      currency_rates: {
        Row: {
          base: string
          fetched_at: string
          id: string
          quote: string
          rate: number
        }
        Insert: {
          base?: string
          fetched_at?: string
          id?: string
          quote: string
          rate: number
        }
        Update: {
          base?: string
          fetched_at?: string
          id?: string
          quote?: string
          rate?: number
        }
        Relationships: []
      }
      daily_content_schedule: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          position: number
          schedule_date: string
          theme: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          position?: number
          schedule_date: string
          theme?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          position?: number
          schedule_date?: string
          theme?: string | null
        }
        Relationships: []
      }
      daily_login_bonuses: {
        Row: {
          bonus_date: string
          coins: number
          created_at: string
          id: string
          streak: number
          user_id: string
        }
        Insert: {
          bonus_date: string
          coins?: number
          created_at?: string
          id?: string
          streak?: number
          user_id: string
        }
        Update: {
          bonus_date?: string
          coins?: number
          created_at?: string
          id?: string
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_quotes: {
        Row: {
          category: string | null
          created_at: string
          date: string
          id: string
          quote: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          date: string
          id?: string
          quote: string
        }
        Update: {
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          quote?: string
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
      daily_tips_pool: {
        Row: {
          category: string
          created_at: string
          id: string
          lang: string
          max_age: number | null
          min_age: number | null
          target_conditions: string[]
          target_tags: string[]
          tip: string
          weight: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          lang?: string
          max_age?: number | null
          min_age?: number | null
          target_conditions?: string[]
          target_tags?: string[]
          tip: string
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          lang?: string
          max_age?: number | null
          min_age?: number | null
          target_conditions?: string[]
          target_tags?: string[]
          tip?: string
          weight?: number
        }
        Relationships: []
      }
      doctor_referrals: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          reason: string
          recommended_specialist: string | null
          urgency: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          recommended_specialist?: string | null
          urgency?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          recommended_specialist?: string | null
          urgency?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_library: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          muscle_group: string | null
          name: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          muscle_group?: string | null
          name: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          muscle_group?: string | null
          name?: string
          video_url?: string | null
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
      family_invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          plan_id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          plan_id: string
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          plan_id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      family_meal_votes: {
        Row: {
          created_at: string
          id: string
          meal_name: string
          plan_id: string
          user_id: string
          vote_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_name: string
          plan_id: string
          user_id: string
          vote_date: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_name?: string
          plan_id?: string
          user_id?: string
          vote_date?: string
        }
        Relationships: []
      }
      family_plan_members: {
        Row: {
          joined_at: string
          plan_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          plan_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_plan_members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "family_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      family_plans: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
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
      food_scan_corrections: {
        Row: {
          corrected: Json
          created_at: string
          id: string
          note: string | null
          original: Json
          scan_id: string | null
          user_id: string
        }
        Insert: {
          corrected: Json
          created_at?: string
          id?: string
          note?: string | null
          original: Json
          scan_id?: string | null
          user_id: string
        }
        Update: {
          corrected?: Json
          created_at?: string
          id?: string
          note?: string | null
          original?: Json
          scan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_scan_corrections_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "food_scans"
            referencedColumns: ["id"]
          },
        ]
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
      form_check_sessions: {
        Row: {
          ai_feedback: Json | null
          created_at: string
          exercise: string
          id: string
          user_id: string
          video_path: string | null
        }
        Insert: {
          ai_feedback?: Json | null
          created_at?: string
          exercise: string
          id?: string
          user_id: string
          video_path?: string | null
        }
        Update: {
          ai_feedback?: Json | null
          created_at?: string
          exercise?: string
          id?: string
          user_id?: string
          video_path?: string | null
        }
        Relationships: []
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
      friend_invites: {
        Row: {
          created_at: string
          id: string
          inviter_id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inviter_id: string
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inviter_id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      gacha_pulls: {
        Row: {
          cost_coins: number
          created_at: string
          id: string
          reward_coins: number | null
          reward_label: string
          user_id: string
        }
        Insert: {
          cost_coins: number
          created_at?: string
          id?: string
          reward_coins?: number | null
          reward_label: string
          user_id: string
        }
        Update: {
          cost_coins?: number
          created_at?: string
          id?: string
          reward_coins?: number | null
          reward_label?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_lists: {
        Row: {
          created_at: string
          id: string
          items: Json
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_challenge_bonuses: {
        Row: {
          challenge_id: string
          coins_awarded: number
          created_at: string
          group_id: string
          id: string
          redemption_id: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          coins_awarded?: number
          created_at?: string
          group_id: string
          id?: string
          redemption_id?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          coins_awarded?: number
          created_at?: string
          group_id?: string
          id?: string
          redemption_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      group_challenges: {
        Row: {
          challenge_id: string
          created_at: string
          created_by: string
          group_id: string
          id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          created_by: string
          group_id: string
          id?: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_stacks: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hydration_challenge_members: {
        Row: {
          challenge_id: string
          id: string
          total_ml: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          total_ml?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          total_ml?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hydration_challenge_members_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "hydration_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      hydration_challenges: {
        Row: {
          created_at: string
          creator_id: string
          end_date: string
          group_id: string
          id: string
          start_date: string
          target_ml: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          end_date: string
          group_id: string
          id?: string
          start_date: string
          target_ml: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          end_date?: string
          group_id?: string
          id?: string
          start_date?: string
          target_ml?: number
        }
        Relationships: []
      }
      imported_recipes: {
        Row: {
          created_at: string
          id: string
          ingredients: Json | null
          raw_html: string | null
          source_url: string
          steps: Json | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredients?: Json | null
          raw_html?: string | null
          source_url: string
          steps?: Json | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredients?: Json | null
          raw_html?: string | null
          source_url?: string
          steps?: Json | null
          title?: string | null
          user_id?: string
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
          tags: string[] | null
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
          tags?: string[] | null
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
          tags?: string[] | null
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
      meal_plan_templates: {
        Row: {
          avoid_allergens: string[]
          created_at: string
          diet_tags: string[]
          id: string
          lang: string
          meals: Json
          name: string
          target_calories: number
        }
        Insert: {
          avoid_allergens?: string[]
          created_at?: string
          diet_tags?: string[]
          id?: string
          lang?: string
          meals: Json
          name: string
          target_calories: number
        }
        Update: {
          avoid_allergens?: string[]
          created_at?: string
          diet_tags?: string[]
          id?: string
          lang?: string
          meals?: Json
          name?: string
          target_calories?: number
        }
        Relationships: []
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
      meal_stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          image_url: string | null
          meal_log_id: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          meal_log_id?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          meal_log_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_stories_meal_log_id_fkey"
            columns: ["meal_log_id"]
            isOneToOne: false
            referencedRelation: "meal_logs"
            referencedColumns: ["id"]
          },
        ]
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
      meditation_sessions: {
        Row: {
          completed_at: string
          duration_min: number
          id: string
          type: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          duration_min: number
          id?: string
          type?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          duration_min?: number
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          action: string
          content_id: string | null
          content_type: string | null
          created_at: string
          expires_at: string | null
          id: string
          moderator_id: string | null
          reason: string
          target_user_id: string
        }
        Insert: {
          action: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          moderator_id?: string | null
          reason: string
          target_user_id: string
        }
        Update: {
          action?: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          moderator_id?: string | null
          reason?: string
          target_user_id?: string
        }
        Relationships: []
      }
      mood_logs: {
        Row: {
          anxiety_level: number | null
          energy_level: number | null
          id: string
          log_date: string | null
          logged_at: string
          mood: number
          mood_label: string | null
          note: string | null
          stress_level: number | null
          triggers: Json | null
          user_id: string
        }
        Insert: {
          anxiety_level?: number | null
          energy_level?: number | null
          id?: string
          log_date?: string | null
          logged_at?: string
          mood: number
          mood_label?: string | null
          note?: string | null
          stress_level?: number | null
          triggers?: Json | null
          user_id: string
        }
        Update: {
          anxiety_level?: number | null
          energy_level?: number | null
          id?: string
          log_date?: string | null
          logged_at?: string
          mood?: number
          mood_label?: string | null
          note?: string | null
          stress_level?: number | null
          triggers?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          achievement_enabled: boolean
          challenge_enabled: boolean
          created_at: string
          exercise_reminder_enabled: boolean
          exercise_time: string | null
          fasting_iftar_enabled: boolean
          fasting_sahur_enabled: boolean
          health_alert_enabled: boolean
          id: string
          marketing_enabled: boolean
          meal_breakfast_time: string | null
          meal_dinner_time: string | null
          meal_lunch_time: string | null
          meal_reminder_enabled: boolean
          prayer_minutes_before: number | null
          prayer_reminder_enabled: boolean
          scan_reminder_enabled: boolean
          social_enabled: boolean
          system_enabled: boolean
          updated_at: string
          user_id: string
          water_end_time: string | null
          water_interval_min: number | null
          water_reminder_enabled: boolean
          water_start_time: string | null
          weekly_report_day: number | null
          weekly_report_enabled: boolean
        }
        Insert: {
          achievement_enabled?: boolean
          challenge_enabled?: boolean
          created_at?: string
          exercise_reminder_enabled?: boolean
          exercise_time?: string | null
          fasting_iftar_enabled?: boolean
          fasting_sahur_enabled?: boolean
          health_alert_enabled?: boolean
          id?: string
          marketing_enabled?: boolean
          meal_breakfast_time?: string | null
          meal_dinner_time?: string | null
          meal_lunch_time?: string | null
          meal_reminder_enabled?: boolean
          prayer_minutes_before?: number | null
          prayer_reminder_enabled?: boolean
          scan_reminder_enabled?: boolean
          social_enabled?: boolean
          system_enabled?: boolean
          updated_at?: string
          user_id: string
          water_end_time?: string | null
          water_interval_min?: number | null
          water_reminder_enabled?: boolean
          water_start_time?: string | null
          weekly_report_day?: number | null
          weekly_report_enabled?: boolean
        }
        Update: {
          achievement_enabled?: boolean
          challenge_enabled?: boolean
          created_at?: string
          exercise_reminder_enabled?: boolean
          exercise_time?: string | null
          fasting_iftar_enabled?: boolean
          fasting_sahur_enabled?: boolean
          health_alert_enabled?: boolean
          id?: string
          marketing_enabled?: boolean
          meal_breakfast_time?: string | null
          meal_dinner_time?: string | null
          meal_lunch_time?: string | null
          meal_reminder_enabled?: boolean
          prayer_minutes_before?: number | null
          prayer_reminder_enabled?: boolean
          scan_reminder_enabled?: boolean
          social_enabled?: boolean
          system_enabled?: boolean
          updated_at?: string
          user_id?: string
          water_end_time?: string | null
          water_interval_min?: number | null
          water_reminder_enabled?: boolean
          water_start_time?: string | null
          weekly_report_day?: number | null
          weekly_report_enabled?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          delivery_channel: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_read: boolean
          is_sent: boolean
          notification_type: string
          read_at: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          delivery_channel?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          is_sent?: boolean
          notification_type: string
          read_at?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          delivery_channel?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          is_sent?: boolean
          notification_type?: string
          read_at?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_quizzes: {
        Row: {
          coins_awarded: number | null
          correct_index: number
          created_at: string
          date: string
          id: string
          is_correct: boolean | null
          options: Json
          question: string
          user_answer: number | null
          user_id: string
        }
        Insert: {
          coins_awarded?: number | null
          correct_index: number
          created_at?: string
          date: string
          id?: string
          is_correct?: boolean | null
          options: Json
          question: string
          user_answer?: number | null
          user_id: string
        }
        Update: {
          coins_awarded?: number | null
          correct_index?: number
          created_at?: string
          date?: string
          id?: string
          is_correct?: boolean | null
          options?: Json
          question?: string
          user_answer?: number | null
          user_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount_idr: number
          created_at: string
          external_order_id: string | null
          external_payment_id: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_gateway: string | null
          payment_method: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_idr: number
          created_at?: string
          external_order_id?: string | null
          external_payment_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_idr?: number
          created_at?: string
          external_order_id?: string | null
          external_payment_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pet_accessories: {
        Row: {
          cost_coins: number
          created_at: string
          emoji: string | null
          id: string
          name: string
          slot: string
        }
        Insert: {
          cost_coins?: number
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          slot: string
        }
        Update: {
          cost_coins?: number
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          slot?: string
        }
        Relationships: []
      }
      pet_interactions: {
        Row: {
          created_at: string
          energy_boost: number | null
          happiness_boost: number | null
          health_boost: number | null
          id: string
          interaction_type: string
          pet_id: string
        }
        Insert: {
          created_at?: string
          energy_boost?: number | null
          happiness_boost?: number | null
          health_boost?: number | null
          id?: string
          interaction_type: string
          pet_id: string
        }
        Update: {
          created_at?: string
          energy_boost?: number | null
          happiness_boost?: number | null
          health_boost?: number | null
          id?: string
          interaction_type?: string
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_interactions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "virtual_pets"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_times: {
        Row: {
          ashar: string | null
          city: string
          created_at: string
          dhuha: string | null
          dzuhur: string | null
          id: string
          imsak: string | null
          isya: string | null
          latitude: number | null
          longitude: number | null
          maghrib: string | null
          prayer_date: string
          province: string | null
          qibla_direction: number | null
          source: string | null
          subuh: string | null
          terbit: string | null
        }
        Insert: {
          ashar?: string | null
          city: string
          created_at?: string
          dhuha?: string | null
          dzuhur?: string | null
          id?: string
          imsak?: string | null
          isya?: string | null
          latitude?: number | null
          longitude?: number | null
          maghrib?: string | null
          prayer_date: string
          province?: string | null
          qibla_direction?: number | null
          source?: string | null
          subuh?: string | null
          terbit?: string | null
        }
        Update: {
          ashar?: string | null
          city?: string
          created_at?: string
          dhuha?: string | null
          dzuhur?: string | null
          id?: string
          imsak?: string | null
          isya?: string | null
          latitude?: number | null
          longitude?: number | null
          maghrib?: string | null
          prayer_date?: string
          province?: string | null
          qibla_direction?: number | null
          source?: string | null
          subuh?: string | null
          terbit?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          allergies: string[] | null
          allow_dm: boolean
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
          daily_scan_limit: number
          daily_steps_target: number | null
          daily_water_target: number | null
          deleted_at: string | null
          dietary_preference: string | null
          display_currency: string
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
          last_scan_date: string | null
          last_seen_report_id: string | null
          location_lat: number | null
          location_lng: number | null
          location_province: string | null
          onboarded: boolean
          phone: string | null
          platform: string | null
          premium_expires_at: string | null
          premium_status: string
          public_profile: boolean
          referral_code: string | null
          referred_by: string | null
          scan_audit_opt_in: boolean
          scan_streak_current: number
          scan_streak_longest: number
          show_meals: boolean
          show_progress_photos: boolean
          show_weight: boolean
          show_workouts: boolean
          streak_days: number
          streak_freeze_used_at: string | null
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
          allow_dm?: boolean
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
          daily_scan_limit?: number
          daily_steps_target?: number | null
          daily_water_target?: number | null
          deleted_at?: string | null
          dietary_preference?: string | null
          display_currency?: string
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
          last_scan_date?: string | null
          last_seen_report_id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_province?: string | null
          onboarded?: boolean
          phone?: string | null
          platform?: string | null
          premium_expires_at?: string | null
          premium_status?: string
          public_profile?: boolean
          referral_code?: string | null
          referred_by?: string | null
          scan_audit_opt_in?: boolean
          scan_streak_current?: number
          scan_streak_longest?: number
          show_meals?: boolean
          show_progress_photos?: boolean
          show_weight?: boolean
          show_workouts?: boolean
          streak_days?: number
          streak_freeze_used_at?: string | null
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
          allow_dm?: boolean
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
          daily_scan_limit?: number
          daily_steps_target?: number | null
          daily_water_target?: number | null
          deleted_at?: string | null
          dietary_preference?: string | null
          display_currency?: string
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
          last_scan_date?: string | null
          last_seen_report_id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_province?: string | null
          onboarded?: boolean
          phone?: string | null
          platform?: string | null
          premium_expires_at?: string | null
          premium_status?: string
          public_profile?: boolean
          referral_code?: string | null
          referred_by?: string | null
          scan_audit_opt_in?: boolean
          scan_streak_current?: number
          scan_streak_longest?: number
          show_meals?: boolean
          show_progress_photos?: boolean
          show_weight?: boolean
          show_workouts?: boolean
          streak_days?: number
          streak_freeze_used_at?: string | null
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
      rate_limit_log: {
        Row: {
          bucket: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      recipe_bookmarks: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
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
      recipe_reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          recipe_id: string
          review: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          recipe_id: string
          review?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          recipe_id?: string
          review?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          avg_rating: number
          body_generated_at: string | null
          body_source: string
          calories: number
          carbs_g: number
          category: string
          cook_count: number
          cook_min: number | null
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
          save_count_snapshot: number
          servings: number
          slug: string | null
          snapshot_at: string | null
          tags: Json | null
          title: string
          total_min: number | null
          updated_at: string
          user_id: string | null
          video_url: string | null
          view_count: number
        }
        Insert: {
          avg_rating?: number
          body_generated_at?: string | null
          body_source?: string
          calories?: number
          carbs_g?: number
          category?: string
          cook_count?: number
          cook_min?: number | null
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
          save_count_snapshot?: number
          servings?: number
          slug?: string | null
          snapshot_at?: string | null
          tags?: Json | null
          title: string
          total_min?: number | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          view_count?: number
        }
        Update: {
          avg_rating?: number
          body_generated_at?: string | null
          body_source?: string
          calories?: number
          carbs_g?: number
          category?: string
          cook_count?: number
          cook_min?: number | null
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
          save_count_snapshot?: number
          servings?: number
          slug?: string | null
          snapshot_at?: string | null
          tags?: Json | null
          title?: string
          total_min?: number | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          view_count?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referred_reward_coins: number
          referrer_id: string
          referrer_reward_coins: number
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referred_reward_coins?: number
          referrer_id: string
          referrer_reward_coins?: number
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referred_reward_coins?: number
          referrer_id?: string
          referrer_reward_coins?: number
          status?: string
        }
        Relationships: []
      }
      restaurants_nearby: {
        Row: {
          address: string | null
          cached_at: string
          id: string
          lat: number
          lng: number
          menu: Json | null
          name: string
        }
        Insert: {
          address?: string | null
          cached_at?: string
          id?: string
          lat: number
          lng: number
          menu?: Json | null
          name: string
        }
        Update: {
          address?: string | null
          cached_at?: string
          id?: string
          lat?: number
          lng?: number
          menu?: Json | null
          name?: string
        }
        Relationships: []
      }
      reward_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          clicked_result_id: string | null
          clicked_result_type: string | null
          filters: Json | null
          id: string
          query: string
          results_count: number | null
          search_type: string | null
          searched_at: string
          user_id: string
        }
        Insert: {
          clicked_result_id?: string | null
          clicked_result_type?: string | null
          filters?: Json | null
          id?: string
          query: string
          results_count?: number | null
          search_type?: string | null
          searched_at?: string
          user_id: string
        }
        Update: {
          clicked_result_id?: string | null
          clicked_result_type?: string | null
          filters?: Json | null
          id?: string
          query?: string
          results_count?: number | null
          search_type?: string | null
          searched_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sensitive_health_notes: {
        Row: {
          category: string | null
          created_at: string
          encrypted_note: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          encrypted_note: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          encrypted_note?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_diet_guides: {
        Row: {
          cons: string[] | null
          created_at: string
          description: string | null
          id: string
          name: string
          pros: string[] | null
          published: boolean
          sample_day: string | null
          short_description: string | null
          slug: string
          tags: string[] | null
          updated_at: string
          who_for: string | null
        }
        Insert: {
          cons?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          pros?: string[] | null
          published?: boolean
          sample_day?: string | null
          short_description?: string | null
          slug: string
          tags?: string[] | null
          updated_at?: string
          who_for?: string | null
        }
        Update: {
          cons?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          pros?: string[] | null
          published?: boolean
          sample_day?: string | null
          short_description?: string | null
          slug?: string
          tags?: string[] | null
          updated_at?: string
          who_for?: string | null
        }
        Relationships: []
      }
      seo_exercises: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          equipment: string | null
          id: string
          met: number
          muscle_groups: string[] | null
          name: string
          published: boolean
          slug: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          met: number
          muscle_groups?: string[] | null
          name: string
          published?: boolean
          slug: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          met?: number
          muscle_groups?: string[] | null
          name?: string
          published?: boolean
          slug?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_foods: {
        Row: {
          calories: number
          carbs_g: number
          category: string
          created_at: string
          description: string | null
          fat_g: number
          fiber_g: number
          id: string
          name: string
          protein_g: number
          published: boolean
          serving_grams: number
          serving_size: string
          slug: string
          sodium_mg: number
          sugar_g: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          calories: number
          carbs_g?: number
          category: string
          created_at?: string
          description?: string | null
          fat_g?: number
          fiber_g?: number
          id?: string
          name: string
          protein_g?: number
          published?: boolean
          serving_grams?: number
          serving_size?: string
          slug: string
          sodium_mg?: number
          sugar_g?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          category?: string
          created_at?: string
          description?: string | null
          fat_g?: number
          fiber_g?: number
          id?: string
          name?: string
          protein_g?: number
          published?: boolean
          serving_grams?: number
          serving_size?: string
          slug?: string
          sodium_mg?: number
          sugar_g?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      sleep_diary: {
        Row: {
          bedtime: string | null
          created_at: string
          diary_date: string
          id: string
          notes: string | null
          quality: number | null
          user_id: string
          wake_time: string | null
        }
        Insert: {
          bedtime?: string | null
          created_at?: string
          diary_date: string
          id?: string
          notes?: string | null
          quality?: number | null
          user_id: string
          wake_time?: string | null
        }
        Update: {
          bedtime?: string | null
          created_at?: string
          diary_date?: string
          id?: string
          notes?: string | null
          quality?: number | null
          user_id?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          bed_time: string | null
          created_at: string
          deep_hours: number | null
          duration_hours: number | null
          id: string
          interruptions: number | null
          light_hours: number | null
          log_date: string | null
          notes: string | null
          pre_sleep_activities: Json | null
          quality: number
          quality_label: string | null
          quality_score: number | null
          rem_hours: number | null
          sleep_end: string
          sleep_start: string
          source: string | null
          time_to_sleep_min: number | null
          updated_at: string
          user_id: string
          wake_time: string | null
        }
        Insert: {
          bed_time?: string | null
          created_at?: string
          deep_hours?: number | null
          duration_hours?: number | null
          id?: string
          interruptions?: number | null
          light_hours?: number | null
          log_date?: string | null
          notes?: string | null
          pre_sleep_activities?: Json | null
          quality?: number
          quality_label?: string | null
          quality_score?: number | null
          rem_hours?: number | null
          sleep_end: string
          sleep_start: string
          source?: string | null
          time_to_sleep_min?: number | null
          updated_at?: string
          user_id: string
          wake_time?: string | null
        }
        Update: {
          bed_time?: string | null
          created_at?: string
          deep_hours?: number | null
          duration_hours?: number | null
          id?: string
          interruptions?: number | null
          light_hours?: number | null
          log_date?: string | null
          notes?: string | null
          pre_sleep_activities?: Json | null
          quality?: number
          quality_label?: string | null
          quality_score?: number | null
          rem_hours?: number | null
          sleep_end?: string
          sleep_start?: string
          source?: string | null
          time_to_sleep_min?: number | null
          updated_at?: string
          user_id?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      smart_alarms: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          user_id: string
          wake_time: string
          window_min: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          user_id: string
          wake_time: string
          window_min?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          user_id?: string
          wake_time?: string
          window_min?: number
        }
        Relationships: []
      }
      story_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "meal_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_likes: {
        Row: {
          created_at: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "meal_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          storage_path: string
          story_id: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          storage_path: string
          story_id?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          storage_path?: string
          story_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          ai_chat_daily_limit: number | null
          billing_period: string
          created_at: string
          description: string | null
          export_limit: number | null
          features: Json | null
          food_scan_daily_limit: number | null
          id: string
          is_active: boolean
          is_visible: boolean
          name: string
          name_en: string | null
          plan_code: string
          price_idr: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          ai_chat_daily_limit?: number | null
          billing_period?: string
          created_at?: string
          description?: string | null
          export_limit?: number | null
          features?: Json | null
          food_scan_daily_limit?: number | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          name: string
          name_en?: string | null
          plan_code: string
          price_idr?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          ai_chat_daily_limit?: number | null
          billing_period?: string
          created_at?: string
          description?: string | null
          export_limit?: number | null
          features?: Json | null
          food_scan_daily_limit?: number | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          name?: string
          name_en?: string | null
          plan_code?: string
          price_idr?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: string | null
          value_type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value?: string | null
          value_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: string | null
          value_type?: string | null
        }
        Relationships: []
      }
      theme_preferences: {
        Row: {
          mode: string
          sunset_lat: number | null
          sunset_lon: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          mode?: string
          sunset_lat?: number | null
          sunset_lon?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          mode?: string
          sunset_lat?: number | null
          sunset_lon?: number | null
          updated_at?: string
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
      user_activity_log: {
        Row: {
          activity_data: Json | null
          activity_type: string
          app_version: string | null
          created_at: string
          id: string
          ip_address: string | null
          platform: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          app_version?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          platform?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          app_version?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          platform?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
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
      user_pet_accessories: {
        Row: {
          accessory_id: string
          equipped: boolean
          id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          accessory_id: string
          equipped?: boolean
          id?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          accessory_id?: string
          equipped?: boolean
          id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pet_accessories_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "pet_accessories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      user_subscriptions: {
        Row: {
          auto_renew: boolean
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_pets: {
        Row: {
          accessories: Json | null
          created_at: string
          energy_stat: number
          evolution_points: number
          evolution_stage: number
          happiness_stat: number
          health_stat: number
          hunger_stat: number
          id: string
          last_fed_at: string | null
          last_played_at: string | null
          pet_avatar_url: string | null
          pet_name: string
          pet_stage: string
          pet_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accessories?: Json | null
          created_at?: string
          energy_stat?: number
          evolution_points?: number
          evolution_stage?: number
          happiness_stat?: number
          health_stat?: number
          hunger_stat?: number
          id?: string
          last_fed_at?: string | null
          last_played_at?: string | null
          pet_avatar_url?: string | null
          pet_name: string
          pet_stage?: string
          pet_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accessories?: Json | null
          created_at?: string
          energy_stat?: number
          evolution_points?: number
          evolution_stage?: number
          happiness_stat?: number
          health_stat?: number
          hunger_stat?: number
          id?: string
          last_fed_at?: string | null
          last_played_at?: string | null
          pet_avatar_url?: string | null
          pet_name?: string
          pet_stage?: string
          pet_type?: string
          updated_at?: string
          user_id?: string
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
      voice_transcripts: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          source: string
          transcript: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          source: string
          transcript: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          source?: string
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          id: string
          log_date: string | null
          logged_at: string
          source: string | null
          user_id: string
          water_type: string | null
        }
        Insert: {
          amount_ml: number
          id?: string
          log_date?: string | null
          logged_at?: string
          source?: string | null
          user_id: string
          water_type?: string | null
        }
        Update: {
          amount_ml?: number
          id?: string
          log_date?: string | null
          logged_at?: string
          source?: string | null
          user_id?: string
          water_type?: string | null
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
      weekly_leaderboard: {
        Row: {
          created_at: string
          id: string
          rank: number | null
          score: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          rank?: number | null
          score?: number
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          rank?: number | null
          score?: number
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_podcasts: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          script: string
          user_id: string
          week_start: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          script: string
          user_id: string
          week_start: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          script?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_report_runs: {
        Row: {
          id: string
          report_id: string | null
          run_at: string
          user_id: string
        }
        Insert: {
          id?: string
          report_id?: string | null
          run_at?: string
          user_id: string
        }
        Update: {
          id?: string
          report_id?: string | null
          run_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_goals: {
        Row: {
          created_at: string
          id: string
          start_weight_kg: number
          target_date: string
          target_weight_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          start_weight_kg: number
          target_date: string
          target_weight_kg: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          start_weight_kg?: number
          target_date?: string
          target_weight_kg?: number
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
      workout_timer_sessions: {
        Row: {
          completed_at: string
          exercise_name: string
          id: string
          rounds: number
          total_seconds: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          exercise_name: string
          id?: string
          rounds?: number
          total_seconds: number
          user_id: string
        }
        Update: {
          completed_at?: string
          exercise_name?: string
          id?: string
          rounds?: number
          total_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      xp_logs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          source: string
          source_id: string | null
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          source: string
          source_id?: string | null
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          source?: string
          source_id?: string | null
          user_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      ai_cost_daily: {
        Row: {
          cache_hits: number | null
          calls: number | null
          cost_usd: number | null
          day: string | null
          tokens: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _get_field_key: { Args: never; Returns: string }
      block_user: { Args: { _target: string }; Returns: string }
      check_rate_limit: {
        Args: {
          _bucket: string
          _max_requests: number
          _window_seconds: number
        }
        Returns: boolean
      }
      claim_group_challenge_bonus: {
        Args: { p_challenge_id: string; p_group_id: string }
        Returns: Json
      }
      cleanup_rate_limit_log: { Args: never; Returns: undefined }
      get_sensitive_note: {
        Args: { _id: string }
        Returns: {
          category: string
          created_at: string
          id: string
          note: string
          title: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_co_challenge_participant: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      list_sensitive_notes: {
        Args: never
        Returns: {
          category: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }[]
      }
      log_audit_event: {
        Args: {
          _action: string
          _entity?: string
          _entity_id?: string
          _meta?: Json
        }
        Returns: undefined
      }
      redeem_friend_invite: { Args: { _token: string }; Returns: string }
      report_content: {
        Args: {
          _content_id: string
          _content_type: string
          _details?: string
          _reason: string
        }
        Returns: string
      }
      request_account_deletion: { Args: { _reason?: string }; Returns: string }
      save_sensitive_note: {
        Args: { _category?: string; _note: string; _title: string }
        Returns: string
      }
      unblock_user: { Args: { _target: string }; Returns: boolean }
      update_sensitive_note: {
        Args: { _category?: string; _id: string; _note: string; _title: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
