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
      help_requests: {
        Row: {
          accepted_offer_id: string | null
          budget: number
          budget_type: string
          category: string
          created_at: string
          details: string
          helper_id: string | null
          id: string
          image: string
          lat: number | null
          lng: number | null
          location_label: string
          neighborhood: string
          preferred_helper_id: string | null
          radius_miles: number
          requester_id: string
          scheduled_for: string | null
          status: string
          title: string
          updated_at: string
          when_label: string
          when_option: string
        }
        Insert: {
          accepted_offer_id?: string | null
          budget: number
          budget_type?: string
          category: string
          created_at?: string
          details: string
          helper_id?: string | null
          id?: string
          image?: string
          lat?: number | null
          lng?: number | null
          location_label?: string
          neighborhood?: string
          preferred_helper_id?: string | null
          radius_miles?: number
          requester_id: string
          scheduled_for?: string | null
          status?: string
          title: string
          updated_at?: string
          when_label: string
          when_option: string
        }
        Update: {
          accepted_offer_id?: string | null
          budget?: number
          budget_type?: string
          category?: string
          created_at?: string
          details?: string
          helper_id?: string | null
          id?: string
          image?: string
          lat?: number | null
          lng?: number | null
          location_label?: string
          neighborhood?: string
          preferred_helper_id?: string | null
          radius_miles?: number
          requester_id?: string
          scheduled_for?: string | null
          status?: string
          title?: string
          updated_at?: string
          when_label?: string
          when_option?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_accepted_offer_fkey"
            columns: ["accepted_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_preferred_helper_id_fkey"
            columns: ["preferred_helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          participant_a: string
          participant_b: string
          request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_a: string
          participant_b: string
          request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_a?: string
          participant_b?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_participant_a_fkey"
            columns: ["participant_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_b_fkey"
            columns: ["participant_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          request_id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          request_id: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          href: string
          id: string
          kind: string
          read_at: string | null
          request_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          href?: string
          id?: string
          kind: string
          read_at?: string | null
          request_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          href?: string
          id?: string
          kind?: string
          read_at?: string | null
          request_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          eta: string
          helper_id: string
          id: string
          note: string
          price: number
          request_id: string
          status: string
        }
        Insert: {
          created_at?: string
          eta?: string
          helper_id: string
          id?: string
          note?: string
          price: number
          request_id: string
          status?: string
        }
        Update: {
          created_at?: string
          eta?: string
          helper_id?: string
          id?: string
          note?: string
          price?: number
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_role: string | null
          availability: string[]
          available_now: boolean
          avatar_url: string
          bio: string
          city: string | null
          city_geoid: string | null
          created_at: string
          email_notifications: boolean
          hourly_rate: number
          id: string
          is_helper: boolean
          jobs_completed: number
          lat: number | null
          lng: number | null
          location_label: string
          name: string
          neighborhood: string
          onboarding_completed_at: string | null
          rate_type: string
          rating: number
          review_count: number
          safety_disclaimer_accepted_at: string | null
          safety_disclaimer_version: string | null
          service_radius_miles: number
          skills: string[]
          state_code: string | null
          updated_at: string
        }
        Insert: {
          account_role?: string | null
          availability?: string[]
          available_now?: boolean
          avatar_url?: string
          bio?: string
          city?: string | null
          city_geoid?: string | null
          created_at?: string
          email_notifications?: boolean
          hourly_rate?: number
          id: string
          is_helper?: boolean
          jobs_completed?: number
          lat?: number | null
          lng?: number | null
          location_label?: string
          name: string
          neighborhood?: string
          onboarding_completed_at?: string | null
          rate_type?: string
          rating?: number
          review_count?: number
          safety_disclaimer_accepted_at?: string | null
          safety_disclaimer_version?: string | null
          service_radius_miles?: number
          skills?: string[]
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          account_role?: string | null
          availability?: string[]
          available_now?: boolean
          avatar_url?: string
          bio?: string
          city?: string | null
          city_geoid?: string | null
          created_at?: string
          email_notifications?: boolean
          hourly_rate?: number
          id?: string
          is_helper?: boolean
          jobs_completed?: number
          lat?: number | null
          lng?: number | null
          location_label?: string
          name?: string
          neighborhood?: string
          onboarding_completed_at?: string | null
          rate_type?: string
          rating?: number
          review_count?: number
          safety_disclaimer_accepted_at?: string | null
          safety_disclaimer_version?: string | null
          service_radius_miles?: number
          skills?: string[]
          state_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_geoid_fkey"
            columns: ["city_geoid"]
            isOneToOne: false
            referencedRelation: "us_places"
            referencedColumns: ["geoid"]
          },
        ]
      }
      request_invites: {
        Row: {
          created_at: string
          helper_id: string
          id: string
          note: string
          request_id: string
          requester_id: string
          status: string
        }
        Insert: {
          created_at?: string
          helper_id: string
          id?: string
          note?: string
          request_id: string
          requester_id: string
          status?: string
        }
        Update: {
          created_at?: string
          helper_id?: string
          id?: string
          note?: string
          request_id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_invites_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_invites_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_invites_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_private_details: {
        Row: {
          exact_address: string
          request_id: string
          updated_at: string
        }
        Insert: {
          exact_address?: string
          request_id: string
          updated_at?: string
        }
        Update: {
          exact_address?: string
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_private_details_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          from_id: string
          id: string
          rating: number
          request_id: string
          to_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          from_id: string
          id?: string
          rating: number
          request_id: string
          to_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          from_id?: string
          id?: string
          rating?: number
          request_id?: string
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_helpers: {
        Row: {
          created_at: string
          helper_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          helper_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          helper_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_helpers_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_helpers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      us_places: {
        Row: {
          geoid: string
          is_incorporated: boolean
          label: string | null
          lat: number
          lng: number
          name: string
          population: number | null
          state_code: string
          state_name: string
        }
        Insert: {
          geoid: string
          is_incorporated?: boolean
          label?: string | null
          lat: number
          lng: number
          name: string
          population?: number | null
          state_code: string
          state_name: string
        }
        Update: {
          geoid?: string
          is_incorporated?: boolean
          label?: string | null
          lat?: number
          lng?: number
          name?: string
          population?: number | null
          state_code?: string
          state_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_offer: {
        Args: { p_offer_id: string }
        Returns: {
          created_at: string
          eta: string
          helper_id: string
          id: string
          note: string
          price: number
          request_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_onboarding: {
        Args: {
          p_accept_safety: boolean
          p_city: string
          p_role: string
          p_safety_version?: string
          p_state_code: string
        }
        Returns: {
          account_role: string | null
          availability: string[]
          available_now: boolean
          avatar_url: string
          bio: string
          city: string | null
          city_geoid: string | null
          created_at: string
          email_notifications: boolean
          hourly_rate: number
          id: string
          is_helper: boolean
          jobs_completed: number
          lat: number | null
          lng: number | null
          location_label: string
          name: string
          neighborhood: string
          onboarding_completed_at: string | null
          rate_type: string
          rating: number
          review_count: number
          safety_disclaimer_accepted_at: string | null
          safety_disclaimer_version: string | null
          service_radius_miles: number
          skills: string[]
          state_code: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_request: {
        Args: { p_request_id: string }
        Returns: {
          accepted_offer_id: string | null
          budget: number
          budget_type: string
          category: string
          created_at: string
          details: string
          helper_id: string | null
          id: string
          image: string
          lat: number | null
          lng: number | null
          location_label: string
          neighborhood: string
          preferred_helper_id: string | null
          radius_miles: number
          requester_id: string
          scheduled_for: string | null
          status: string
          title: string
          updated_at: string
          when_label: string
          when_option: string
        }
        SetofOptions: {
          from: "*"
          to: "help_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_thread: {
        Args: { p_other_user_id: string; p_request_id: string }
        Returns: {
          created_at: string
          id: string
          last_message_at: string
          participant_a: string
          participant_b: string
          request_id: string
        }
        SetofOptions: {
          from: "*"
          to: "message_threads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_public_marketplace: { Args: never; Returns: Json }
      haversine_miles: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      invite_helper: {
        Args: { p_helper_id: string; p_note?: string; p_request_id: string }
        Returns: {
          created_at: string
          helper_id: string
          id: string
          note: string
          request_id: string
          requester_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "request_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      submit_review: {
        Args: {
          p_comment: string
          p_rating: number
          p_request_id: string
          p_to_id: string
        }
        Returns: {
          comment: string
          created_at: string
          from_id: string
          id: string
          rating: number
          request_id: string
          to_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
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
