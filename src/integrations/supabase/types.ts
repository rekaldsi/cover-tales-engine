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
      collection_snapshots: {
        Row: {
          comic_count: number
          created_at: string
          graded_count: number
          id: string
          key_issue_count: number
          snapshot_date: string
          total_value: number
          user_id: string
        }
        Insert: {
          comic_count?: number
          created_at?: string
          graded_count?: number
          id?: string
          key_issue_count?: number
          snapshot_date?: string
          total_value?: number
          user_id: string
        }
        Update: {
          comic_count?: number
          created_at?: string
          graded_count?: number
          id?: string
          key_issue_count?: number
          snapshot_date?: string
          total_value?: number
          user_id?: string
        }
        Relationships: []
      }
      comic_creators: {
        Row: {
          comic_id: string
          confidence: number | null
          created_at: string
          id: string
          name: string
          role: string
          source: string
        }
        Insert: {
          comic_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          name: string
          role: string
          source: string
        }
        Update: {
          comic_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          name?: string
          role?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "comic_creators_comic_id_fkey"
            columns: ["comic_id"]
            isOneToOne: false
            referencedRelation: "comics"
            referencedColumns: ["id"]
          },
        ]
      }
      comic_value_history: {
        Row: {
          comic_id: string
          id: string
          recorded_at: string
          source: string
          value: number
        }
        Insert: {
          comic_id: string
          id?: string
          recorded_at?: string
          source: string
          value: number
        }
        Update: {
          comic_id?: string
          id?: string
          recorded_at?: string
          source?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "comic_value_history_comic_id_fkey"
            columns: ["comic_id"]
            isOneToOne: false
            referencedRelation: "comics"
            referencedColumns: ["id"]
          },
        ]
      }
      comic_value_sources: {
        Row: {
          comic_id: string
          comps: Json | null
          confidence: number | null
          error_reason: string | null
          fetched_at: string | null
          grade_context: string | null
          id: string
          provider: string
          range_high: number | null
          range_low: number | null
          status: string
          value: number | null
        }
        Insert: {
          comic_id: string
          comps?: Json | null
          confidence?: number | null
          error_reason?: string | null
          fetched_at?: string | null
          grade_context?: string | null
          id?: string
          provider: string
          range_high?: number | null
          range_low?: number | null
          status: string
          value?: number | null
        }
        Update: {
          comic_id?: string
          comps?: Json | null
          confidence?: number | null
          error_reason?: string | null
          fetched_at?: string | null
          grade_context?: string | null
          id?: string
          provider?: string
          range_high?: number | null
          range_low?: number | null
          status?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comic_value_sources_comic_id_fkey"
            columns: ["comic_id"]
            isOneToOne: false
            referencedRelation: "comics"
            referencedColumns: ["id"]
          },
        ]
      }
      comics: {
        Row: {
          artist: string | null
          barcode: string | null
          cert_number: string | null
          characters: string[] | null
          colorist: string | null
          comicvine_id: string | null
          condition_confidence: string | null
          condition_notes: string | null
          confidence_score: number | null
          copy_number: number | null
          cover_artist: string | null
          cover_date: string | null
          cover_image_url: string | null
          cover_price: string | null
          created_at: string
          credits_source: string | null
          current_value: number | null
          editor: string | null
          era: string | null
          estimated_raw_grade: string | null
          first_appearance_of: string | null
          grade: number | null
          grade_status: string | null
          graded_date: string | null
          grader_notes: string | null
          id: string
          inker: string | null
          inner_well_notes: string | null
          is_key_issue: boolean | null
          is_signed: boolean | null
          issue_number: string | null
          key_issue_reason: string | null
          label_type: string | null
          letterer: string | null
          location: string | null
          media_tie_in: string | null
          notes: string | null
          page_quality: string | null
          print_number: number | null
          publisher: string | null
          purchase_date: string | null
          purchase_price: number | null
          signature_type: string | null
          signatures: Json | null
          signed_by: string | null
          signed_date: string | null
          story_arc: string | null
          synopsis: string | null
          title: string
          upc_code: string | null
          updated_at: string
          user_id: string
          value_range_high: number | null
          value_range_low: number | null
          variant_type: string | null
          visible_defects: string[] | null
          volume: string | null
          writer: string | null
        }
        Insert: {
          artist?: string | null
          barcode?: string | null
          cert_number?: string | null
          characters?: string[] | null
          colorist?: string | null
          comicvine_id?: string | null
          condition_confidence?: string | null
          condition_notes?: string | null
          confidence_score?: number | null
          copy_number?: number | null
          cover_artist?: string | null
          cover_date?: string | null
          cover_image_url?: string | null
          cover_price?: string | null
          created_at?: string
          credits_source?: string | null
          current_value?: number | null
          editor?: string | null
          era?: string | null
          estimated_raw_grade?: string | null
          first_appearance_of?: string | null
          grade?: number | null
          grade_status?: string | null
          graded_date?: string | null
          grader_notes?: string | null
          id?: string
          inker?: string | null
          inner_well_notes?: string | null
          is_key_issue?: boolean | null
          is_signed?: boolean | null
          issue_number?: string | null
          key_issue_reason?: string | null
          label_type?: string | null
          letterer?: string | null
          location?: string | null
          media_tie_in?: string | null
          notes?: string | null
          page_quality?: string | null
          print_number?: number | null
          publisher?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          signature_type?: string | null
          signatures?: Json | null
          signed_by?: string | null
          signed_date?: string | null
          story_arc?: string | null
          synopsis?: string | null
          title: string
          upc_code?: string | null
          updated_at?: string
          user_id: string
          value_range_high?: number | null
          value_range_low?: number | null
          variant_type?: string | null
          visible_defects?: string[] | null
          volume?: string | null
          writer?: string | null
        }
        Update: {
          artist?: string | null
          barcode?: string | null
          cert_number?: string | null
          characters?: string[] | null
          colorist?: string | null
          comicvine_id?: string | null
          condition_confidence?: string | null
          condition_notes?: string | null
          confidence_score?: number | null
          copy_number?: number | null
          cover_artist?: string | null
          cover_date?: string | null
          cover_image_url?: string | null
          cover_price?: string | null
          created_at?: string
          credits_source?: string | null
          current_value?: number | null
          editor?: string | null
          era?: string | null
          estimated_raw_grade?: string | null
          first_appearance_of?: string | null
          grade?: number | null
          grade_status?: string | null
          graded_date?: string | null
          grader_notes?: string | null
          id?: string
          inker?: string | null
          inner_well_notes?: string | null
          is_key_issue?: boolean | null
          is_signed?: boolean | null
          issue_number?: string | null
          key_issue_reason?: string | null
          label_type?: string | null
          letterer?: string | null
          location?: string | null
          media_tie_in?: string | null
          notes?: string | null
          page_quality?: string | null
          print_number?: number | null
          publisher?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          signature_type?: string | null
          signatures?: Json | null
          signed_by?: string | null
          signed_date?: string | null
          story_arc?: string | null
          synopsis?: string | null
          title?: string
          upc_code?: string | null
          updated_at?: string
          user_id?: string
          value_range_high?: number | null
          value_range_low?: number | null
          variant_type?: string | null
          visible_defects?: string[] | null
          volume?: string | null
          writer?: string | null
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          column_mapping: Json | null
          created_at: string
          detected_columns: string[] | null
          error_message: string | null
          failed_rows: number
          filename: string
          id: string
          processed_rows: number
          status: string
          successful_rows: number
          total_rows: number
          updated_at: string
          user_id: string
        }
        Insert: {
          column_mapping?: Json | null
          created_at?: string
          detected_columns?: string[] | null
          error_message?: string | null
          failed_rows?: number
          filename: string
          id?: string
          processed_rows?: number
          status?: string
          successful_rows?: number
          total_rows?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          column_mapping?: Json | null
          created_at?: string
          detected_columns?: string[] | null
          error_message?: string | null
          failed_rows?: number
          filename?: string
          id?: string
          processed_rows?: number
          status?: string
          successful_rows?: number
          total_rows?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_rows: {
        Row: {
          comic_id: string | null
          created_at: string
          error_message: string | null
          id: string
          import_job_id: string
          parsed_data: Json | null
          raw_data: Json
          row_number: number
          status: string
        }
        Insert: {
          comic_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          import_job_id: string
          parsed_data?: Json | null
          raw_data: Json
          row_number: number
          status?: string
        }
        Update: {
          comic_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          import_job_id?: string
          parsed_data?: Json | null
          raw_data?: Json
          row_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_comic_id_fkey"
            columns: ["comic_id"]
            isOneToOne: false
            referencedRelation: "comics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_runs: {
        Row: {
          comic_id: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          function: string
          http_status: number | null
          id: string
          latency_ms: number | null
          provider: string
          request_id: string | null
          status: string
          summary: Json | null
          user_id: string | null
        }
        Insert: {
          comic_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          function: string
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          provider: string
          request_id?: string | null
          status: string
          summary?: Json | null
          user_id?: string | null
        }
        Update: {
          comic_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          function?: string
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          provider?: string
          request_id?: string | null
          status?: string
          summary?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      pricing_providers: {
        Row: {
          enabled: boolean
          error_rate_24h: number | null
          last_error_at: string | null
          last_ok_at: string | null
          method: string
          notes: string | null
          provider: string
        }
        Insert: {
          enabled?: boolean
          error_rate_24h?: number | null
          last_error_at?: string | null
          last_ok_at?: string | null
          method: string
          notes?: string | null
          provider: string
        }
        Update: {
          enabled?: boolean
          error_rate_24h?: number | null
          last_error_at?: string | null
          last_ok_at?: string | null
          method?: string
          notes?: string | null
          provider?: string
        }
        Relationships: []
      }
      verification_results: {
        Row: {
          comic_id: string
          confidence: number | null
          id: string
          match_score: number | null
          matched_issue: Json | null
          notes: string | null
          provider: string
          raw_response: Json | null
          status: string
          verified_at: string
        }
        Insert: {
          comic_id: string
          confidence?: number | null
          id?: string
          match_score?: number | null
          matched_issue?: Json | null
          notes?: string | null
          provider: string
          raw_response?: Json | null
          status?: string
          verified_at?: string
        }
        Update: {
          comic_id?: string
          confidence?: number | null
          id?: string
          match_score?: number | null
          matched_issue?: Json | null
          notes?: string | null
          provider?: string
          raw_response?: Json | null
          status?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_results_comic_id_fkey"
            columns: ["comic_id"]
            isOneToOne: false
            referencedRelation: "comics"
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
