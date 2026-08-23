export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          role: Database['public']['Enums']['app_role']
          default_lesson_duration_minutes: number | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          role: Database['public']['Enums']['app_role']
          default_lesson_duration_minutes?: number | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          phone?: string | null
          default_lesson_duration_minutes?: number | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      availability_rules: {
        Row: {
          id: string
          trainer_id: string
          iso_weekday: number
          start_time: string
          end_time: string
          active: boolean
          valid_from: string
          valid_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          iso_weekday: number
          start_time: string
          end_time: string
          active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          iso_weekday?: number
          start_time?: string
          end_time?: string
          active?: boolean
          valid_from?: string
          valid_until?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'availability_rules_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      availability_exceptions: {
        Row: {
          id: string
          trainer_id: string
          starts_at: string
          ends_at: string
          reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          starts_at: string
          ends_at: string
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          starts_at?: string
          ends_at?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'availability_exceptions_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      lesson_packages: {
        Row: {
          id: string
          trainer_id: string
          student_id: string
          relationship_id: string
          lesson_count: number
          price_cents: number
          starts_on: string
          expires_on: string
          status: Database['public']['Enums']['package_status']
          activated_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          student_id: string
          relationship_id: string
          lesson_count: number
          price_cents: number
          starts_on: string
          expires_on: string
          status?: Database['public']['Enums']['package_status']
          activated_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: Database['public']['Enums']['package_status']
          activated_at?: string | null
          cancelled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lesson_packages_relationship_id_fkey'
            columns: ['relationship_id']
            isOneToOne: false
            referencedRelation: 'trainer_student_relationships'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lesson_packages_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lesson_packages_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      credit_transactions: {
        Row: {
          id: string
          trainer_id: string
          student_id: string
          package_id: string | null
          appointment_id: string | null
          amount: number
          transaction_type: Database['public']['Enums']['credit_transaction_type']
          reason: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          student_id: string
          package_id?: string | null
          appointment_id?: string | null
          amount: number
          transaction_type: Database['public']['Enums']['credit_transaction_type']
          reason?: string | null
          created_by: string
          created_at?: string
        }
        Update: Record<never, never>
        Relationships: [
          {
            foreignKeyName: 'credit_transactions_package_id_fkey'
            columns: ['package_id']
            isOneToOne: false
            referencedRelation: 'lesson_packages'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          id: string
          trainer_id: string
          student_id: string
          package_id: string
          amount_cents: number
          due_on: string
          status: Database['public']['Enums']['payment_status']
          paid_on: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Record<never, never>
        Update: Record<never, never>
        Relationships: []
      }
      payment_events: {
        Row: {
          id: string
          payment_id: string
          trainer_id: string
          student_id: string
          status: Database['public']['Enums']['payment_status']
          amount_cents: number
          due_on: string
          paid_on: string | null
          actor_id: string
          created_at: string
        }
        Insert: Record<never, never>
        Update: Record<never, never>
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          trainer_id: string
          student_id: string
          relationship_id: string
          package_id: string
          starts_at: string
          ends_at: string
          status: Database['public']['Enums']['appointment_status']
          booking_request_id: string
          rescheduled_from_id: string | null
          created_by: string
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          student_id: string
          relationship_id: string
          package_id: string
          starts_at: string
          ends_at: string
          status?: Database['public']['Enums']['appointment_status']
          booking_request_id: string
          rescheduled_from_id?: string | null
          created_by: string
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: Database['public']['Enums']['appointment_status']
          cancelled_at?: string | null
          rescheduled_from_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_package_id_fkey'
            columns: ['package_id']
            isOneToOne: false
            referencedRelation: 'lesson_packages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      appointment_events: {
        Row: {
          id: string
          appointment_id: string
          trainer_id: string
          student_id: string
          event_type: Database['public']['Enums']['appointment_event_type']
          actor_id: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          trainer_id: string
          student_id: string
          event_type: Database['public']['Enums']['appointment_event_type']
          actor_id: string
          details?: Json
          created_at?: string
        }
        Update: Record<never, never>
        Relationships: [
          {
            foreignKeyName: 'appointment_events_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
        ]
      }
      trainer_student_relationships: {
        Row: {
          id: string
          trainer_id: string
          student_id: string
          status: Database['public']['Enums']['relationship_status']
          started_at: string | null
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trainer_id: string
          student_id: string
          status?: Database['public']['Enums']['relationship_status']
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: Database['public']['Enums']['relationship_status']
          ended_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trainer_student_relationships_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trainer_student_relationships_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      student_invitations: {
        Row: {
          id: string
          token: string
          trainer_id: string
          student_email: string | null
          student_phone: string | null
          status: Database['public']['Enums']['invitation_status']
          expires_at: string
          accepted_by: string | null
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          token?: string
          trainer_id: string
          student_email?: string | null
          student_phone?: string | null
          status?: Database['public']['Enums']['invitation_status']
          expires_at?: string
          accepted_by?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          student_email?: string | null
          student_phone?: string | null
          status?: Database['public']['Enums']['invitation_status']
          accepted_by?: string | null
          accepted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'student_invitations_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      accept_student_invitation: {
        Args: { invitation_token: string }
        Returns: Database['public']['Tables']['trainer_student_relationships']['Row']
      }
      claim_student_invitation: {
        Args: { invitation_token?: string }
        Returns: Database['public']['Tables']['trainer_student_relationships']['Row']
      }
      get_available_slots: {
        Args: {
          target_trainer_id: string
          range_start: string
          range_end: string
        }
        Returns: Array<{
          slot_start: string
          slot_end: string
        }>
      }
      activate_lesson_package: {
        Args: { target_package_id: string }
        Returns: Database['public']['Tables']['lesson_packages']['Row']
      }
      adjust_student_credits: {
        Args: {
          target_student_id: string
          adjustment_amount: number
          adjustment_reason: string
        }
        Returns: Database['public']['Tables']['credit_transactions']['Row']
      }
      cancel_lesson_package: {
        Args: { target_package_id: string }
        Returns: Database['public']['Tables']['lesson_packages']['Row']
      }
      get_credit_balance: {
        Args: { target_student_id: string }
        Returns: number
      }
      book_appointment: {
        Args: {
          target_trainer_id: string
          requested_start: string
          requested_booking_id: string
        }
        Returns: Database['public']['Tables']['appointments']['Row']
      }
      book_appointment_for_student: {
        Args: {
          target_student_id: string
          requested_start: string
          requested_booking_id: string
        }
        Returns: Database['public']['Tables']['appointments']['Row']
      }
      cancel_appointment: {
        Args: { target_appointment_id: string; cancellation_note?: string }
        Returns: Database['public']['Tables']['appointments']['Row']
      }
      reschedule_appointment: {
        Args: {
          target_appointment_id: string
          requested_start: string
          requested_reschedule_id: string
        }
        Returns: Database['public']['Tables']['appointments']['Row']
      }
      complete_appointment: {
        Args: {
          target_appointment_id: string
          requested_outcome: Database['public']['Enums']['appointment_status']
        }
        Returns: Database['public']['Tables']['appointments']['Row']
      }
      correct_appointment_outcome: {
        Args: {
          target_appointment_id: string
          requested_outcome: Database['public']['Enums']['appointment_status']
          correction_reason: string
        }
        Returns: Database['public']['Tables']['appointments']['Row']
      }
      save_payment: {
        Args: {
          target_payment_id: string
          target_package_id: string
          requested_amount_cents: number
          requested_due_on: string
          requested_status: Database['public']['Enums']['payment_status']
          requested_paid_on?: string | null
        }
        Returns: Database['public']['Tables']['payments']['Row']
      }
    }
    Enums: {
      app_role: 'student' | 'trainer'
      relationship_status: 'pending' | 'active' | 'ended'
      invitation_status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
      package_status: 'draft' | 'active' | 'exhausted' | 'expired' | 'cancelled'
      credit_transaction_type:
        | 'package_activation'
        | 'package_cancellation'
        | 'appointment_consumption'
        | 'cancellation_refund'
        | 'manual_adjustment'
      appointment_status:
        | 'scheduled'
        | 'completed'
        | 'cancelled_by_student'
        | 'cancelled_by_trainer'
        | 'cancelled_for_reschedule'
        | 'student_no_show'
      appointment_event_type:
        'created' | 'cancelled' | 'rescheduled' | 'completed' | 'student_no_show'
      payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled'
    }
    CompositeTypes: Record<never, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
