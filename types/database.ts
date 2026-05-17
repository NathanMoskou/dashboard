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
      bucket_list_items: {
        Row: {
          completed_date: string | null
          created_at: string | null
          estimated_cost_eur: number | null
          id: string
          is_completed: boolean | null
          priority: number | null
          target_date: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          estimated_cost_eur?: number | null
          id?: string
          is_completed?: boolean | null
          priority?: number | null
          target_date?: string | null
          title: string
          user_id?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          estimated_cost_eur?: number | null
          id?: string
          is_completed?: boolean | null
          priority?: number | null
          target_date?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category: string
          created_at: string
          target_eur: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          target_eur: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          target_eur?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string | null
          hourly_rate_eur: number | null
          id: string
          is_active: boolean | null
          name: string
          notion_client_name: string | null
          notion_hours_db_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hourly_rate_eur?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          notion_client_name?: string | null
          notion_hours_db_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          hourly_rate_eur?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          notion_client_name?: string | null
          notion_hours_db_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      csv_imports: {
        Row: {
          filename: string | null
          id: string
          imported_at: string | null
          period_end: string | null
          period_start: string | null
          row_count: number | null
          user_id: string
        }
        Insert: {
          filename?: string | null
          id?: string
          imported_at?: string | null
          period_end?: string | null
          period_start?: string | null
          row_count?: number | null
          user_id?: string
        }
        Update: {
          filename?: string | null
          id?: string
          imported_at?: string | null
          period_end?: string | null
          period_start?: string | null
          row_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      daily_overrides: {
        Row: {
          created_at: string
          date: string
          deep_work_hours_manual: number | null
          deep_work_skipped: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          deep_work_hours_manual?: number | null
          deep_work_skipped?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          deep_work_hours_manual?: number | null
          deep_work_skipped?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          client_id: string | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          is_billable: boolean | null
          notes: string | null
          notion_synced: boolean | null
          notion_task_id: string | null
          started_at: string
          task_description: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_billable?: boolean | null
          notes?: string | null
          notion_synced?: boolean | null
          notion_task_id?: string | null
          started_at: string
          task_description?: string | null
          type?: string | null
          user_id?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_billable?: boolean | null
          notes?: string | null
          notion_synced?: boolean | null
          notion_task_id?: string | null
          started_at?: string
          task_description?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          completed_at: string | null
          date: string
          habit_item_id: string
          id: string
          quantity_value: number | null
          skip_reason: string | null
          user_id: string
          was_auto: boolean | null
          was_skipped: boolean | null
        }
        Insert: {
          completed_at?: string | null
          date: string
          habit_item_id: string
          id?: string
          quantity_value?: number | null
          skip_reason?: string | null
          user_id?: string
          was_auto?: boolean | null
          was_skipped?: boolean | null
        }
        Update: {
          completed_at?: string | null
          date?: string
          habit_item_id?: string
          id?: string
          quantity_value?: number | null
          skip_reason?: string | null
          user_id?: string
          was_auto?: boolean | null
          was_skipped?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_item_id_fkey"
            columns: ["habit_item_id"]
            isOneToOne: false
            referencedRelation: "habit_items"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_items: {
        Row: {
          auto_source: string | null
          category: string | null
          color: string | null
          created_at: string | null
          custom_days: number[] | null
          display_order: number | null
          dosage: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          name: string
          pair_after_habit_id: string | null
          quantity_target: number | null
          reminder_time: string | null
          streak_current: number | null
          streak_longest: number | null
          target_per_week: number | null
          time_of_day: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          auto_source?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          custom_days?: number[] | null
          display_order?: number | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pair_after_habit_id?: string | null
          quantity_target?: number | null
          reminder_time?: string | null
          streak_current?: number | null
          streak_longest?: number | null
          target_per_week?: number | null
          time_of_day?: string | null
          type?: string | null
          user_id?: string
        }
        Update: {
          auto_source?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          custom_days?: number[] | null
          display_order?: number | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pair_after_habit_id?: string | null
          quantity_target?: number | null
          reminder_time?: string | null
          streak_current?: number | null
          streak_longest?: number | null
          target_per_week?: number | null
          time_of_day?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_items_pair_after_habit_id_fkey"
            columns: ["pair_after_habit_id"]
            isOneToOne: false
            referencedRelation: "habit_items"
            referencedColumns: ["id"]
          },
        ]
      }
      health_entries: {
        Row: {
          active_calories_kcal: number | null
          body_fat_pct: number | null
          created_at: string | null
          date: string
          diastolic_bp: number | null
          hrv_ms: number | null
          id: string
          mood: number | null
          readiness_score: number | null
          resting_heart_rate: number | null
          sleep_duration_min: number | null
          sleep_quality: number | null
          sleep_score: number | null
          steps: number | null
          systolic_bp: number | null
          user_id: string
          vo2_max: number | null
          wake_time: string | null
          weight_kg: number | null
        }
        Insert: {
          active_calories_kcal?: number | null
          body_fat_pct?: number | null
          created_at?: string | null
          date: string
          diastolic_bp?: number | null
          hrv_ms?: number | null
          id?: string
          mood?: number | null
          readiness_score?: number | null
          resting_heart_rate?: number | null
          sleep_duration_min?: number | null
          sleep_quality?: number | null
          sleep_score?: number | null
          steps?: number | null
          systolic_bp?: number | null
          user_id?: string
          vo2_max?: number | null
          wake_time?: string | null
          weight_kg?: number | null
        }
        Update: {
          active_calories_kcal?: number | null
          body_fat_pct?: number | null
          created_at?: string | null
          date?: string
          diastolic_bp?: number | null
          hrv_ms?: number | null
          id?: string
          mood?: number | null
          readiness_score?: number | null
          resting_heart_rate?: number | null
          sleep_duration_min?: number | null
          sleep_quality?: number | null
          sleep_score?: number | null
          steps?: number | null
          systolic_bp?: number | null
          user_id?: string
          vo2_max?: number | null
          wake_time?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string | null
          date: string
          day_rating: number | null
          free_text: string | null
          id: string
          insight: string | null
          mood_rating: number | null
          productivity_rating: number | null
          updated_at: string | null
          user_id: string
          was_difficult: string | null
          went_well: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          day_rating?: number | null
          free_text?: string | null
          id?: string
          insight?: string | null
          mood_rating?: number | null
          productivity_rating?: number | null
          updated_at?: string | null
          user_id?: string
          was_difficult?: string | null
          went_well?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          day_rating?: number | null
          free_text?: string | null
          id?: string
          insight?: string | null
          mood_rating?: number | null
          productivity_rating?: number | null
          updated_at?: string | null
          user_id?: string
          was_difficult?: string | null
          went_well?: string | null
        }
        Relationships: []
      }
      rest_config: {
        Row: {
          billable_weekly_goal_h: number | null
          compound_high_reps_s: number | null
          compound_low_reps_s: number | null
          compound_mid_reps_s: number | null
          deep_work_daily_goal_h: number | null
          early_rise_threshold: string | null
          id: string
          isolation_high_reps_s: number | null
          isolation_low_reps_s: number | null
          isolation_mid_reps_s: number | null
          user_id: string
        }
        Insert: {
          billable_weekly_goal_h?: number | null
          compound_high_reps_s?: number | null
          compound_low_reps_s?: number | null
          compound_mid_reps_s?: number | null
          deep_work_daily_goal_h?: number | null
          early_rise_threshold?: string | null
          id?: string
          isolation_high_reps_s?: number | null
          isolation_low_reps_s?: number | null
          isolation_mid_reps_s?: number | null
          user_id?: string
        }
        Update: {
          billable_weekly_goal_h?: number | null
          compound_high_reps_s?: number | null
          compound_low_reps_s?: number | null
          compound_mid_reps_s?: number | null
          deep_work_daily_goal_h?: number | null
          early_rise_threshold?: string | null
          id?: string
          isolation_high_reps_s?: number | null
          isolation_low_reps_s?: number | null
          isolation_mid_reps_s?: number | null
          user_id?: string
        }
        Relationships: []
      }
      routine_blocks: {
        Row: {
          color_id: string
          created_at: string
          display_order: number
          end_h: number
          end_m: number
          id: string
          start_h: number
          start_m: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color_id?: string
          created_at?: string
          display_order?: number
          end_h: number
          end_m: number
          id?: string
          start_h: number
          start_m: number
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          color_id?: string
          created_at?: string
          display_order?: number
          end_h?: number
          end_m?: number
          id?: string
          start_h?: number
          start_m?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions_dismissed: {
        Row: {
          created_at: string
          pattern_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pattern_key: string
          user_id?: string
        }
        Update: {
          created_at?: string
          pattern_key?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_eur: number
          category: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          import_batch_id: string | null
          subcategory: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          amount_eur: number
          category?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          import_batch_id?: string | null
          subcategory?: string | null
          type?: string | null
          user_id?: string
        }
        Update: {
          amount_eur?: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          import_batch_id?: string | null
          subcategory?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "csv_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          apple_health_api_key: string | null
          dark_end_hour: number
          dark_start_hour: number
          email_state: Json | null
          google_access_token: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          notif_evening_enabled: boolean
          notif_evening_time: string
          notif_morning_enabled: boolean
          notif_morning_time: string
          notion_access_token: string | null
          notion_projects_db_id: string | null
          notion_tasks_db_id: string | null
          notion_work_tracker_db_id: string | null
          notion_workspace_id: string | null
          push_subscription: Json | null
          theme: string
          today_widget_config: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          apple_health_api_key?: string | null
          dark_end_hour?: number
          dark_start_hour?: number
          email_state?: Json | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          notif_evening_enabled?: boolean
          notif_evening_time?: string
          notif_morning_enabled?: boolean
          notif_morning_time?: string
          notion_access_token?: string | null
          notion_projects_db_id?: string | null
          notion_tasks_db_id?: string | null
          notion_work_tracker_db_id?: string | null
          notion_workspace_id?: string | null
          push_subscription?: Json | null
          theme?: string
          today_widget_config?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          apple_health_api_key?: string | null
          dark_end_hour?: number
          dark_start_hour?: number
          email_state?: Json | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          notif_evening_enabled?: boolean
          notif_evening_time?: string
          notif_morning_enabled?: boolean
          notif_morning_time?: string
          notion_access_token?: string | null
          notion_projects_db_id?: string | null
          notion_tasks_db_id?: string | null
          notion_work_tracker_db_id?: string | null
          notion_workspace_id?: string | null
          push_subscription?: Json | null
          theme?: string
          today_widget_config?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          created_at: string | null
          focus_next_week: string | null
          id: string
          improve_on: string | null
          stats_snapshot: Json | null
          user_id: string
          week_end: string
          week_start: string
          went_well: string | null
        }
        Insert: {
          created_at?: string | null
          focus_next_week?: string | null
          id?: string
          improve_on?: string | null
          stats_snapshot?: Json | null
          user_id?: string
          week_end: string
          week_start: string
          went_well?: string | null
        }
        Update: {
          created_at?: string | null
          focus_next_week?: string | null
          id?: string
          improve_on?: string | null
          stats_snapshot?: Json | null
          user_id?: string
          week_end?: string
          week_start?: string
          went_well?: string | null
        }
        Relationships: []
      }
      work_sessions: {
        Row: {
          client_name: string
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          is_billable: boolean
          notion_page_id: string | null
          notion_synced: boolean | null
          started_at: string
          task_description: string | null
          user_id: string
        }
        Insert: {
          client_name: string
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_billable?: boolean
          notion_page_id?: string | null
          notion_synced?: boolean | null
          started_at?: string
          task_description?: string | null
          user_id?: string
        }
        Update: {
          client_name?: string
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_billable?: boolean
          notion_page_id?: string | null
          notion_synced?: boolean | null
          started_at?: string
          task_description?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          active_kcal: number | null
          avg_hr: number | null
          created_at: string
          distance_km: number | null
          duration_min: number
          end_time: string
          id: string
          location: string | null
          max_hr: number | null
          resting_kcal: number | null
          start_time: string
          steps: number | null
          user_id: string
          workout_type: string
        }
        Insert: {
          active_kcal?: number | null
          avg_hr?: number | null
          created_at?: string
          distance_km?: number | null
          duration_min: number
          end_time: string
          id?: string
          location?: string | null
          max_hr?: number | null
          resting_kcal?: number | null
          start_time: string
          steps?: number | null
          user_id: string
          workout_type: string
        }
        Update: {
          active_kcal?: number | null
          avg_hr?: number | null
          created_at?: string
          distance_km?: number | null
          duration_min?: number
          end_time?: string
          id?: string
          location?: string | null
          max_hr?: number | null
          resting_kcal?: number | null
          start_time?: string
          steps?: number | null
          user_id?: string
          workout_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      seed_user_defaults: { Args: never; Returns: undefined }
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
