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
          copy_number: number | null
          cover_artist: string | null
          cover_date: string | null
          cover_image_url: string | null
          cover_price: string | null
          created_at: string
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
          copy_number?: number | null
          cover_artist?: string | null
          cover_date?: string | null
          cover_image_url?: string | null
          cover_price?: string | null
          created_at?: string
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
          copy_number?: number | null
          cover_artist?: string | null
          cover_date?: string | null
          cover_image_url?: string | null
          cover_price?: string | null
          created_at?: string
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
          variant_type?: string | null
          visible_defects?: string[] | null
          volume?: string | null
          writer?: string | null
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
