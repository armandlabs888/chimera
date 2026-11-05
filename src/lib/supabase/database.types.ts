export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          avatar_url: string
          bio: string
          neighborhood: string
          skills: string[]
          hourly_rate: number
          availability: string[]
          rating: number
          review_count: number
          jobs_completed: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          avatar_url?: string
          bio?: string
          neighborhood?: string
          skills?: string[]
          hourly_rate?: number
          availability?: string[]
          rating?: number
          review_count?: number
          jobs_completed?: number
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      help_requests: {
        Row: {
          id: string
          title: string
          details: string
          category: string
          neighborhood: string
          when_option: string
          when_label: string
          budget: number
          status: string
          requester_id: string
          image: string
          accepted_offer_id: string | null
          helper_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          details: string
          category: string
          neighborhood: string
          when_option: string
          when_label: string
          budget: number
          status?: string
          requester_id: string
          image?: string
          accepted_offer_id?: string | null
          helper_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['help_requests']['Insert']>
      }
      offers: {
        Row: {
          id: string
          request_id: string
          helper_id: string
          price: number
          note: string
          eta: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          helper_id: string
          price: number
          note?: string
          eta?: string
          status?: string
        }
        Update: Partial<Database['public']['Tables']['offers']['Insert']>
      }
      message_threads: {
        Row: {
          id: string
          request_id: string
          participant_a: string
          participant_b: string
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          participant_a: string
          participant_b: string
          last_message_at?: string
        }
        Update: Partial<Database['public']['Tables']['message_threads']['Insert']>
      }
      messages: {
        Row: {
          id: string
          thread_id: string
          request_id: string
          sender_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          request_id: string
          sender_id: string
          body: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      reviews: {
        Row: {
          id: string
          request_id: string
          from_id: string
          to_id: string
          rating: number
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          from_id: string
          to_id: string
          rating: number
          comment?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
      }
    }
    Functions: {
      accept_offer: { Args: { p_offer_id: string }; Returns: Database['public']['Tables']['offers']['Row'] }
      complete_request: {
        Args: { p_request_id: string }
        Returns: Database['public']['Tables']['help_requests']['Row']
      }
      ensure_thread: {
        Args: { p_request_id: string; p_other_user_id: string }
        Returns: Database['public']['Tables']['message_threads']['Row']
      }
      submit_review: {
        Args: {
          p_request_id: string
          p_to_id: string
          p_rating: number
          p_comment: string
        }
        Returns: Database['public']['Tables']['reviews']['Row']
      }
    }
  }
}
