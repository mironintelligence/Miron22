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
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      case_reminders: {
        Row: {
          created_at: string | null
          details: string | null
          due_at: string
          id: string
          notified_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          due_at: string
          id: string
          notified_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          due_at?: string
          id?: string
          notified_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          category: string
          content: string
          created_at: string | null
          description: string | null
          id: number
          title: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          description?: string | null
          id?: number
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          description?: string | null
          id?: number
          title?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          citation_count: number | null
          court: string
          created_at: string | null
          decision_date: string | null
          decision_no: string | null
          fingerprint: string | null
          full_text: string
          hash: string
          id: string
          raw_json: Json | null
          referenced_laws: string[] | null
          source: string
          source_url: string | null
          summary: string | null
        }
        Insert: {
          citation_count?: number | null
          court: string
          created_at?: string | null
          decision_date?: string | null
          decision_no?: string | null
          fingerprint?: string | null
          full_text: string
          hash: string
          id?: string
          raw_json?: Json | null
          referenced_laws?: string[] | null
          source: string
          source_url?: string | null
          summary?: string | null
        }
        Update: {
          citation_count?: number | null
          court?: string
          created_at?: string | null
          decision_date?: string | null
          decision_no?: string | null
          fingerprint?: string | null
          full_text?: string
          hash?: string
          id?: string
          raw_json?: Json | null
          referenced_laws?: string[] | null
          source?: string
          source_url?: string | null
          summary?: string | null
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          approved_until: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          note: string | null
          phone: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_until?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          note?: string | null
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_until?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          note?: string | null
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_usage: number | null
          type: string | null
          used_count: number | null
          value: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_usage?: number | null
          type?: string | null
          used_count?: number | null
          value?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_usage?: number | null
          type?: string | null
          used_count?: number | null
          value?: number | null
        }
        Relationships: []
      }
      feedback_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          meta_data: Json | null
          name: string
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          meta_data?: Json | null
          name: string
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          meta_data?: Json | null
          name?: string
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ingestion_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          last_error: string | null
          priority: number | null
          source_url: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          priority?: number | null
          source_url: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          priority?: number | null
          source_url?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_chunks: {
        Row: {
          authority_score: number | null
          chunk_text: string
          citation_score: number | null
          court_type: string | null
          decision_date: string | null
          decision_id: string | null
          embedding: string | null
          id: string
          tsv: unknown
        }
        Insert: {
          authority_score?: number | null
          chunk_text: string
          citation_score?: number | null
          court_type?: string | null
          decision_date?: string | null
          decision_id?: string | null
          embedding?: string | null
          id?: string
          tsv?: unknown
        }
        Update: {
          authority_score?: number | null
          chunk_text?: string
          citation_score?: number | null
          court_type?: string | null
          decision_date?: string | null
          decision_id?: string | null
          embedding?: string | null
          id?: string
          tsv?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "legal_chunks_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_consents: {
        Row: {
          agreed_at: string
          agreement_type: string
          document_version_hash: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          agreed_at?: string
          agreement_type: string
          document_version_hash: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          agreed_at?: string
          agreement_type?: string
          document_version_hash?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_updates_log: {
        Row: {
          documents_added: number | null
          documents_updated: number | null
          error_message: string | null
          id: string
          run_at: string | null
          source: string
          status: string | null
        }
        Insert: {
          documents_added?: number | null
          documents_updated?: number | null
          error_message?: string | null
          id?: string
          run_at?: string | null
          source: string
          status?: string | null
        }
        Update: {
          documents_added?: number | null
          documents_updated?: number | null
          error_message?: string | null
          id?: string
          run_at?: string | null
          source?: string
          status?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: number
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_revoked: boolean | null
          refresh_token_hash: string
          revoked_at: string | null
          revoked_reason: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_revoked?: boolean | null
          refresh_token_hash: string
          revoked_at?: string | null
          revoked_reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_revoked?: boolean | null
          refresh_token_hash?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          feature_name: string
          id: string
          meta_data: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          feature_name: string
          id?: string
          meta_data?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          feature_name?: string
          id?: string
          meta_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contracts: {
        Row: {
          analysis_result: Json | null
          created_at: string | null
          generated_content: string | null
          id: number
          original_content: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string | null
          generated_content?: string | null
          id?: number
          original_content?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string | null
          generated_content?: string | null
          id?: number
          original_content?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_contracts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          demo_expires_at: string | null
          email: string
          failed_login_attempts: number | null
          first_name: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_login_at: string | null
          last_login_ip: string | null
          last_name: string | null
          locked_until: string | null
          password_hash: string | null
          payment_card_on_file: boolean | null
          refresh_token_hash: string | null
          role: string | null
          subscription_plan: string | null
          subscription_status: string | null
          token_version: number | null
          trial_ends_at: string | null
          updated_at: string | null
          used_discount_code: string | null
        }
        Insert: {
          created_at?: string | null
          demo_expires_at?: string | null
          email: string
          failed_login_attempts?: number | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          last_login_ip?: string | null
          last_name?: string | null
          locked_until?: string | null
          password_hash?: string | null
          payment_card_on_file?: boolean | null
          refresh_token_hash?: string | null
          role?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          token_version?: number | null
          trial_ends_at?: string | null
          updated_at?: string | null
          used_discount_code?: string | null
        }
        Update: {
          created_at?: string | null
          demo_expires_at?: string | null
          email?: string
          failed_login_attempts?: number | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          last_login_ip?: string | null
          last_name?: string | null
          locked_until?: string | null
          password_hash?: string | null
          payment_card_on_file?: boolean | null
          refresh_token_hash?: string | null
          role?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          token_version?: number | null
          trial_ends_at?: string | null
          updated_at?: string | null
          used_discount_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      miron_effective_user_id: { Args: never; Returns: string }
    }
    Enums: {
      user_role: "admin" | "user" | "demo"
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
      user_role: ["admin", "user", "demo"],
    },
  },
} as const
