export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      profiles: {
        Row: {
          availability: string[]
          available_now: boolean
          avatar_url: string
          bio: string
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
          rate_type: string
          rating: number
          review_count: number
          service_radius_miles: number
          skills: string[]
          updated_at: string
        }
        Insert: {
          availability?: string[]
          available_now?: boolean
          avatar_url?: string
          bio?: string
          created_at?: string
          email_notifications?: boolean
          hourly_rate?: number
          id: string
          is_helper?: boolean
          jobs_completed?: number
          lat?: number | null
          lng?: number | null
          location_label?: string
          name?: string
          neighborhood?: string
          rate_type?: string
          rating?: number
          review_count?: number
          service_radius_miles?: number
          skills?: string[]
          updated_at?: string
        }
        Update: {
          availability?: string[]
          available_now?: boolean
          avatar_url?: string
          bio?: string
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
          rate_type?: string
          rating?: number
          review_count?: number
          service_radius_miles?: number
          skills?: string[]
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_offer: {
        Args: { p_offer_id: string }
        Returns: Database['public']['Tables']['offers']['Row']
      }
      complete_request: {
        Args: { p_request_id: string }
        Returns: Database['public']['Tables']['help_requests']['Row']
      }
      ensure_thread: {
        Args: { p_other_user_id: string; p_request_id: string }
        Returns: Database['public']['Tables']['message_threads']['Row']
      }
      get_public_marketplace: { Args: never; Returns: Json }
      haversine_miles: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      invite_helper: {
        Args: { p_helper_id: string; p_note?: string; p_request_id: string }
        Returns: Database['public']['Tables']['request_invites']['Row']
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      submit_review: {
        Args: {
          p_comment: string
          p_rating: number
          p_request_id: string
          p_to_id: string
        }
        Returns: Database['public']['Tables']['reviews']['Row']
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
