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
      approval_steps: {
        Row: {
          approver_id: string
          created_at: string
          id: string
          note: string | null
          order_index: number
          request_id: string
          signature_path: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["step_status"]
        }
        Insert: {
          approver_id: string
          created_at?: string
          id?: string
          note?: string | null
          order_index: number
          request_id: string
          signature_path?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["step_status"]
        }
        Update: {
          approver_id?: string
          created_at?: string
          id?: string
          note?: string | null
          order_index?: number
          request_id?: string
          signature_path?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["step_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          message: string
          request_id: string
          step_index: number | null
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          message: string
          request_id: string
          step_index?: number | null
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string
          request_id?: string
          step_index?: number | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          short_id: string
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          short_id: string
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          short_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      qr_signing_tokens: {
        Row: {
          approver_name: string
          completed: boolean
          created_at: string
          expires_at: string
          id: string
          request_id: string
          signature_data_url: string | null
          step_id: string
          token: string
        }
        Insert: {
          approver_name: string
          completed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          request_id: string
          signature_data_url?: string | null
          step_id: string
          token: string
        }
        Update: {
          approver_name?: string
          completed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          request_id?: string
          signature_data_url?: string | null
          step_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_signing_tokens_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_signing_tokens_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      request_files: {
        Row: {
          created_at: string
          filename: string
          id: string
          path: string
          request_id: string
          type: string | null
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          path: string
          request_id: string
          type?: string | null
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          path?: string
          request_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_files_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "approver"
      request_status:
        | "PENDING"
        | "IN_PROGRESS"
        | "APPROVED"
        | "RETURNED"
        | "REJECTED"
      step_status: "WAITING" | "APPROVED" | "RETURNED" | "SKIPPED"
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
      app_role: ["admin", "user", "approver"],
      request_status: [
        "PENDING",
        "IN_PROGRESS",
        "APPROVED",
        "RETURNED",
        "REJECTED",
      ],
      step_status: ["WAITING", "APPROVED", "RETURNED", "SKIPPED"],
    },
  },
} as const
