export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appointment_events: {
        Row: {
          actor_id: string
          appointment_id: string
          created_at: string
          details: Json
          event_type: Database['public']['Enums']['appointment_event_type']
          id: string
          student_id: string
          trainer_id: string
        }
        Insert: {
          actor_id: string
          appointment_id: string
          created_at?: string
          details?: Json
          event_type: Database['public']['Enums']['appointment_event_type']
          id?: string
          student_id: string
          trainer_id: string
        }
        Update: {
          actor_id?: string
          appointment_id?: string
          created_at?: string
          details?: Json
          event_type?: Database['public']['Enums']['appointment_event_type']
          id?: string
          student_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointment_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointment_events_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointment_events_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointment_events_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      appointments: {
        Row: {
          booking_request_id: string
          cancelled_at: string | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          package_id: string
          relationship_id: string
          rescheduled_from_id: string | null
          starts_at: string
          status: Database['public']['Enums']['appointment_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          booking_request_id: string
          cancelled_at?: string | null
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          package_id: string
          relationship_id: string
          rescheduled_from_id?: string | null
          starts_at: string
          status?: Database['public']['Enums']['appointment_status']
          student_id: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          booking_request_id?: string
          cancelled_at?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          package_id?: string
          relationship_id?: string
          rescheduled_from_id?: string | null
          starts_at?: string
          status?: Database['public']['Enums']['appointment_status']
          student_id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointment_package_parties'
            columns: ['package_id', 'trainer_id', 'student_id']
            isOneToOne: false
            referencedRelation: 'lesson_packages'
            referencedColumns: ['id', 'trainer_id', 'student_id']
          },
          {
            foreignKeyName: 'appointment_relationship_parties'
            columns: ['relationship_id', 'trainer_id', 'student_id']
            isOneToOne: false
            referencedRelation: 'student_activity_summary'
            referencedColumns: ['relationship_id', 'trainer_id', 'student_id']
          },
          {
            foreignKeyName: 'appointment_relationship_parties'
            columns: ['relationship_id', 'trainer_id', 'student_id']
            isOneToOne: false
            referencedRelation: 'trainer_student_relationships'
            referencedColumns: ['id', 'trainer_id', 'student_id']
          },
          {
            foreignKeyName: 'appointments_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_package_id_fkey'
            columns: ['package_id']
            isOneToOne: false
            referencedRelation: 'lesson_packages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_rescheduled_from_id_fkey'
            columns: ['rescheduled_from_id']
            isOneToOne: false
            referencedRelation: 'appointments'
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
      availability_exceptions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
          trainer_id?: string
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
      availability_rules: {
        Row: {
          active: boolean
          created_at: string
          end_time: string
          id: string
          iso_weekday: number
          start_time: string
          trainer_id: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_time: string
          id?: string
          iso_weekday: number
          start_time: string
          trainer_id: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          end_time?: string
          id?: string
          iso_weekday?: number
          start_time?: string
          trainer_id?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
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
      credit_transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          created_by: string
          id: string
          package_id: string | null
          reason: string | null
          student_id: string
          trainer_id: string
          transaction_type: Database['public']['Enums']['credit_transaction_type']
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          package_id?: string | null
          reason?: string | null
          student_id: string
          trainer_id: string
          transaction_type: Database['public']['Enums']['credit_transaction_type']
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          package_id?: string | null
          reason?: string | null
          student_id?: string
          trainer_id?: string
          transaction_type?: Database['public']['Enums']['credit_transaction_type']
        }
        Relationships: [
          {
            foreignKeyName: 'credit_transactions_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'credit_transactions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'credit_transactions_package_id_fkey'
            columns: ['package_id']
            isOneToOne: false
            referencedRelation: 'lesson_packages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'credit_transactions_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'credit_transactions_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      lesson_packages: {
        Row: {
          activated_at: string | null
          cancelled_at: string | null
          created_at: string
          expires_on: string
          id: string
          lesson_count: number
          price_cents: number
          relationship_id: string
          starts_on: string
          status: Database['public']['Enums']['package_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          expires_on: string
          id?: string
          lesson_count: number
          price_cents: number
          relationship_id: string
          starts_on: string
          status?: Database['public']['Enums']['package_status']
          student_id: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          expires_on?: string
          id?: string
          lesson_count?: number
          price_cents?: number
          relationship_id?: string
          starts_on?: string
          status?: Database['public']['Enums']['package_status']
          student_id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lesson_package_relationship_parties'
            columns: ['relationship_id', 'trainer_id', 'student_id']
            isOneToOne: false
            referencedRelation: 'student_activity_summary'
            referencedColumns: ['relationship_id', 'trainer_id', 'student_id']
          },
          {
            foreignKeyName: 'lesson_package_relationship_parties'
            columns: ['relationship_id', 'trainer_id', 'student_id']
            isOneToOne: false
            referencedRelation: 'trainer_student_relationships'
            referencedColumns: ['id', 'trainer_id', 'student_id']
          },
          {
            foreignKeyName: 'lesson_packages_relationship_id_fkey'
            columns: ['relationship_id']
            isOneToOne: false
            referencedRelation: 'student_activity_summary'
            referencedColumns: ['relationship_id']
          },
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
      payment_events: {
        Row: {
          actor_id: string
          amount_cents: number
          created_at: string
          due_on: string
          id: string
          paid_on: string | null
          payment_id: string
          status: Database['public']['Enums']['payment_status']
          student_id: string
          trainer_id: string
        }
        Insert: {
          actor_id: string
          amount_cents: number
          created_at?: string
          due_on: string
          id?: string
          paid_on?: string | null
          payment_id: string
          status: Database['public']['Enums']['payment_status']
          student_id: string
          trainer_id: string
        }
        Update: {
          actor_id?: string
          amount_cents?: number
          created_at?: string
          due_on?: string
          id?: string
          paid_on?: string | null
          payment_id?: string
          status?: Database['public']['Enums']['payment_status']
          student_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_events_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_events_payment_id_fkey'
            columns: ['payment_id']
            isOneToOne: false
            referencedRelation: 'payments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_events_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_events_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string
          due_on: string
          id: string
          package_id: string
          paid_on: string | null
          status: Database['public']['Enums']['payment_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by: string
          due_on: string
          id: string
          package_id: string
          paid_on?: string | null
          status?: Database['public']['Enums']['payment_status']
          student_id: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string
          due_on?: string
          id?: string
          package_id?: string
          paid_on?: string | null
          status?: Database['public']['Enums']['payment_status']
          student_id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_package_parties'
            columns: ['package_id', 'trainer_id', 'student_id']
            isOneToOne: false
            referencedRelation: 'lesson_packages'
            referencedColumns: ['id', 'trainer_id', 'student_id']
          },
          {
            foreignKeyName: 'payments_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_package_id_fkey'
            columns: ['package_id']
            isOneToOne: false
            referencedRelation: 'lesson_packages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_lesson_duration_minutes: number | null
          full_name: string
          id: string
          phone: string | null
          role: Database['public']['Enums']['app_role']
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_lesson_duration_minutes?: number | null
          full_name: string
          id: string
          phone?: string | null
          role: Database['public']['Enums']['app_role']
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_lesson_duration_minutes?: number | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database['public']['Enums']['app_role']
          updated_at?: string
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          created_at: string
          id: string
          measurements: Json
          note: string | null
          recorded_by: string
          recorded_on: string
          student_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          measurements?: Json
          note?: string | null
          recorded_by: string
          recorded_on: string
          student_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          measurements?: Json
          note?: string | null
          recorded_by?: string
          recorded_on?: string
          student_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'progress_entries_recorded_by_fkey'
            columns: ['recorded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'progress_entries_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      progress_photos: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          position: Database['public']['Enums']['photo_position']
          storage_path: string
          student_id: string
          taken_on: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          position: Database['public']['Enums']['photo_position']
          storage_path: string
          student_id: string
          taken_on: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          position?: Database['public']['Enums']['photo_position']
          storage_path?: string
          student_id?: string
          taken_on?: string
        }
        Relationships: [
          {
            foreignKeyName: 'progress_photos_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      student_goals: {
        Row: {
          created_at: string
          created_by: string
          id: string
          initial_value: number
          kind: Database['public']['Enums']['goal_kind']
          status: Database['public']['Enums']['goal_status']
          student_id: string
          target_date: string
          target_value: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          initial_value: number
          kind: Database['public']['Enums']['goal_kind']
          status?: Database['public']['Enums']['goal_status']
          student_id: string
          target_date: string
          target_value: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          initial_value?: number
          kind?: Database['public']['Enums']['goal_kind']
          status?: Database['public']['Enums']['goal_status']
          student_id?: string
          target_date?: string
          target_value?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'student_goals_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_goals_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_goals_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      student_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          expires_at: string
          id: string
          status: Database['public']['Enums']['invitation_status']
          student_email: string | null
          student_phone: string | null
          token: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          status?: Database['public']['Enums']['invitation_status']
          student_email?: string | null
          student_phone?: string | null
          token?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          status?: Database['public']['Enums']['invitation_status']
          student_email?: string | null
          student_phone?: string | null
          token?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'student_invitations_accepted_by_fkey'
            columns: ['accepted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'student_invitations_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      trainer_student_relationships: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          started_at: string | null
          status: Database['public']['Enums']['relationship_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database['public']['Enums']['relationship_status']
          student_id: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database['public']['Enums']['relationship_status']
          student_id?: string
          trainer_id?: string
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
    }
    Views: {
      student_activity_summary: {
        Row: {
          active_goals: number | null
          attendance_goal_per_week: number | null
          attendance_rate: number | null
          balance: number | null
          completed_30d: number | null
          completed_total: number | null
          full_name: string | null
          last_completed_at: string | null
          last_progress_on: string | null
          next_appointment_at: string | null
          next_due_on: string | null
          next_renewal_on: string | null
          no_show_30d: number | null
          no_show_total: number | null
          overdue_goals: number | null
          overdue_payments: number | null
          pending_payments: number | null
          phone: string | null
          relationship_id: string | null
          started_at: string | null
          student_id: string | null
          trainer_id: string | null
          upcoming_count: number | null
          weekly_average_4w: number | null
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
    }
    Functions: {
      activate_lesson_package: {
        Args: { target_package_id: string }
        Returns: {
          activated_at: string | null
          cancelled_at: string | null
          created_at: string
          expires_on: string
          id: string
          lesson_count: number
          price_cents: number
          relationship_id: string
          starts_on: string
          status: Database['public']['Enums']['package_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'lesson_packages'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      adjust_student_credits: {
        Args: {
          adjustment_amount: number
          adjustment_reason: string
          target_student_id: string
        }
        Returns: {
          amount: number
          appointment_id: string | null
          created_at: string
          created_by: string
          id: string
          package_id: string | null
          reason: string | null
          student_id: string
          trainer_id: string
          transaction_type: Database['public']['Enums']['credit_transaction_type']
        }
        SetofOptions: {
          from: '*'
          to: 'credit_transactions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_appointment: {
        Args: {
          requested_booking_id: string
          requested_start: string
          target_trainer_id: string
        }
        Returns: {
          booking_request_id: string
          cancelled_at: string | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          package_id: string
          relationship_id: string
          rescheduled_from_id: string | null
          starts_at: string
          status: Database['public']['Enums']['appointment_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'appointments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_appointment_for_student: {
        Args: {
          requested_booking_id: string
          requested_start: string
          target_student_id: string
        }
        Returns: {
          booking_request_id: string
          cancelled_at: string | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          package_id: string
          relationship_id: string
          rescheduled_from_id: string | null
          starts_at: string
          status: Database['public']['Enums']['appointment_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'appointments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_appointment: {
        Args: { cancellation_note?: string; target_appointment_id: string }
        Returns: {
          booking_request_id: string
          cancelled_at: string | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          package_id: string
          relationship_id: string
          rescheduled_from_id: string | null
          starts_at: string
          status: Database['public']['Enums']['appointment_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'appointments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_lesson_package: {
        Args: { target_package_id: string }
        Returns: {
          activated_at: string | null
          cancelled_at: string | null
          created_at: string
          expires_on: string
          id: string
          lesson_count: number
          price_cents: number
          relationship_id: string
          starts_on: string
          status: Database['public']['Enums']['package_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'lesson_packages'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_student_invitation: {
        Args: { target_invitation_id: string }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          expires_at: string
          id: string
          status: Database['public']['Enums']['invitation_status']
          student_email: string | null
          student_phone: string | null
          token: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'student_invitations'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_student_invitation: {
        Args: { invitation_token?: string }
        Returns: {
          created_at: string
          ended_at: string | null
          id: string
          started_at: string | null
          status: Database['public']['Enums']['relationship_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'trainer_student_relationships'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_appointment: {
        Args: {
          requested_outcome: Database['public']['Enums']['appointment_status']
          target_appointment_id: string
        }
        Returns: {
          booking_request_id: string
          cancelled_at: string | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          package_id: string
          relationship_id: string
          rescheduled_from_id: string | null
          starts_at: string
          status: Database['public']['Enums']['appointment_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'appointments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      correct_appointment_outcome: {
        Args: {
          correction_reason: string
          requested_outcome: Database['public']['Enums']['appointment_status']
          target_appointment_id: string
        }
        Returns: {
          booking_request_id: string
          cancelled_at: string | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          package_id: string
          relationship_id: string
          rescheduled_from_id: string | null
          starts_at: string
          status: Database['public']['Enums']['appointment_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'appointments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_progress_photo: {
        Args: { target_photo_id: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          id: string
          position: Database['public']['Enums']['photo_position']
          storage_path: string
          student_id: string
          taken_on: string
        }
        SetofOptions: {
          from: '*'
          to: 'progress_photos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      end_relationship: {
        Args: { target_relationship_id: string }
        Returns: {
          created_at: string
          ended_at: string | null
          id: string
          started_at: string | null
          status: Database['public']['Enums']['relationship_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'trainer_student_relationships'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_elapsed_appointments: { Args: never; Returns: number }
      get_available_slots: {
        Args: {
          range_end: string
          range_start: string
          target_trainer_id: string
        }
        Returns: {
          slot_end: string
          slot_start: string
        }[]
      }
      get_credit_balance: {
        Args: { target_student_id: string }
        Returns: number
      }
      is_active_trainer_of: {
        Args: { target_student_id: string }
        Returns: boolean
      }
      reschedule_appointment: {
        Args: {
          requested_reschedule_id: string
          requested_start: string
          target_appointment_id: string
        }
        Returns: {
          booking_request_id: string
          cancelled_at: string | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          package_id: string
          relationship_id: string
          rescheduled_from_id: string | null
          starts_at: string
          status: Database['public']['Enums']['appointment_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'appointments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_payment: {
        Args: {
          requested_amount_cents: number
          requested_due_on: string
          requested_paid_on?: string
          requested_status: Database['public']['Enums']['payment_status']
          target_package_id: string
          target_payment_id: string
        }
        Returns: {
          amount_cents: number
          created_at: string
          created_by: string
          due_on: string
          id: string
          package_id: string
          paid_on: string | null
          status: Database['public']['Enums']['payment_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'payments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      schedule_appointment: {
        Args: {
          requested_booking_id: string
          requested_start: string
          target_student_id: string
          target_trainer_id: string
        }
        Returns: {
          booking_request_id: string
          cancelled_at: string | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          package_id: string
          relationship_id: string
          rescheduled_from_id: string | null
          starts_at: string
          status: Database['public']['Enums']['appointment_status']
          student_id: string
          trainer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'appointments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_own_profile: {
        Args: {
          requested_full_name: string
          requested_lesson_duration_minutes?: number
          requested_phone?: string
        }
        Returns: {
          created_at: string
          default_lesson_duration_minutes: number | null
          full_name: string
          id: string
          phone: string | null
          role: Database['public']['Enums']['app_role']
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'profiles'
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: 'student' | 'trainer'
      appointment_event_type:
        'created' | 'cancelled' | 'rescheduled' | 'completed' | 'student_no_show'
      appointment_status:
        | 'scheduled'
        | 'completed'
        | 'cancelled_by_student'
        | 'cancelled_by_trainer'
        | 'cancelled_for_reschedule'
        | 'student_no_show'
      credit_transaction_type:
        | 'package_activation'
        | 'package_cancellation'
        | 'appointment_consumption'
        | 'cancellation_refund'
        | 'manual_adjustment'
      goal_kind: 'weight' | 'attendance'
      goal_status: 'active' | 'achieved' | 'abandoned'
      invitation_status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
      package_status: 'draft' | 'active' | 'exhausted' | 'expired' | 'cancelled'
      payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled'
      photo_position: 'front' | 'side' | 'back'
      relationship_status: 'pending' | 'active' | 'ended'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ['student', 'trainer'],
      appointment_event_type: [
        'created',
        'cancelled',
        'rescheduled',
        'completed',
        'student_no_show',
      ],
      appointment_status: [
        'scheduled',
        'completed',
        'cancelled_by_student',
        'cancelled_by_trainer',
        'cancelled_for_reschedule',
        'student_no_show',
      ],
      credit_transaction_type: [
        'package_activation',
        'package_cancellation',
        'appointment_consumption',
        'cancellation_refund',
        'manual_adjustment',
      ],
      goal_kind: ['weight', 'attendance'],
      goal_status: ['active', 'achieved', 'abandoned'],
      invitation_status: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
      package_status: ['draft', 'active', 'exhausted', 'expired', 'cancelled'],
      payment_status: ['pending', 'paid', 'overdue', 'cancelled'],
      photo_position: ['front', 'side', 'back'],
      relationship_status: ['pending', 'active', 'ended'],
    },
  },
} as const
