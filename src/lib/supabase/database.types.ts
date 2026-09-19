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
      exercise_aliases: {
        Row: {
          alias: string
          created_at: string
          exercise_id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          alias: string
          created_at?: string
          exercise_id: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          alias?: string
          created_at?: string
          exercise_id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'exercise_aliases_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exercise_aliases_trainer_id_fkey'
            columns: ['trainer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      exercises: {
        Row: {
          body_parts: string[]
          created_at: string
          equipments: string[]
          external_id: string | null
          id: string
          name_en: string
          name_pt: string | null
          owner_trainer_id: string | null
          secondary_muscles: string[]
          source: Database['public']['Enums']['exercise_source']
          target_muscles: string[]
        }
        Insert: {
          body_parts?: string[]
          created_at?: string
          equipments?: string[]
          external_id?: string | null
          id?: string
          name_en: string
          name_pt?: string | null
          owner_trainer_id?: string | null
          secondary_muscles?: string[]
          source: Database['public']['Enums']['exercise_source']
          target_muscles?: string[]
        }
        Update: {
          body_parts?: string[]
          created_at?: string
          equipments?: string[]
          external_id?: string | null
          id?: string
          name_en?: string
          name_pt?: string | null
          owner_trainer_id?: string | null
          secondary_muscles?: string[]
          source?: Database['public']['Enums']['exercise_source']
          target_muscles?: string[]
        }
        Relationships: [
          {
            foreignKeyName: 'exercises_owner_trainer_id_fkey'
            columns: ['owner_trainer_id']
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
          kind: Database['public']['Enums']['package_kind']
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
          kind?: Database['public']['Enums']['package_kind']
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
          kind?: Database['public']['Enums']['package_kind']
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: Database['public']['Enums']['notification_kind']
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: Database['public']['Enums']['notification_kind']
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database['public']['Enums']['notification_kind']
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
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
      routine_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          position: number
          rest_seconds: number | null
          routine_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          rest_seconds?: number | null
          routine_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          rest_seconds?: number | null
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'routine_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'routine_exercises_routine_id_fkey'
            columns: ['routine_id']
            isOneToOne: false
            referencedRelation: 'routines'
            referencedColumns: ['id']
          },
        ]
      }
      routine_sets: {
        Row: {
          id: string
          position: number
          routine_exercise_id: string
          target_reps: number | null
          target_weight_kg: number | null
        }
        Insert: {
          id?: string
          position: number
          routine_exercise_id: string
          target_reps?: number | null
          target_weight_kg?: number | null
        }
        Update: {
          id?: string
          position?: number
          routine_exercise_id?: string
          target_reps?: number | null
          target_weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'routine_sets_routine_exercise_id_fkey'
            columns: ['routine_exercise_id']
            isOneToOne: false
            referencedRelation: 'routine_exercises'
            referencedColumns: ['id']
          },
        ]
      }
      routines: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          student_id: string | null
          trainer_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          student_id?: string | null
          trainer_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          student_id?: string | null
          trainer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'routines_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'routines_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'routines_trainer_id_fkey'
            columns: ['trainer_id']
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
      workout_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          position: number
          rest_seconds: number | null
          workout_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          rest_seconds?: number | null
          workout_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          rest_seconds?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_exercises_workout_id_fkey'
            columns: ['workout_id']
            isOneToOne: false
            referencedRelation: 'workouts'
            referencedColumns: ['id']
          },
        ]
      }
      workout_sets: {
        Row: {
          completed_at: string | null
          id: string
          position: number
          previous_reps: number | null
          previous_weight_kg: number | null
          reps: number | null
          set_type: Database['public']['Enums']['workout_set_type']
          weight_kg: number | null
          workout_exercise_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          position: number
          previous_reps?: number | null
          previous_weight_kg?: number | null
          reps?: number | null
          set_type?: Database['public']['Enums']['workout_set_type']
          weight_kg?: number | null
          workout_exercise_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          position?: number
          previous_reps?: number | null
          previous_weight_kg?: number | null
          reps?: number | null
          set_type?: Database['public']['Enums']['workout_set_type']
          weight_kg?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_sets_workout_exercise_id_fkey'
            columns: ['workout_exercise_id']
            isOneToOne: false
            referencedRelation: 'workout_exercises'
            referencedColumns: ['id']
          },
        ]
      }
      workouts: {
        Row: {
          appointment_id: string | null
          created_at: string
          discarded_at: string | null
          duration_seconds: number | null
          finished_at: string | null
          id: string
          name: string
          notes: string | null
          recorded_by: string
          routine_id: string | null
          started_at: string
          student_id: string
          trainer_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          discarded_at?: string | null
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          name: string
          notes?: string | null
          recorded_by: string
          routine_id?: string | null
          started_at?: string
          student_id: string
          trainer_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          discarded_at?: string | null
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          recorded_by?: string
          routine_id?: string | null
          started_at?: string
          student_id?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'workouts_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workouts_recorded_by_fkey'
            columns: ['recorded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workouts_routine_id_fkey'
            columns: ['routine_id']
            isOneToOne: false
            referencedRelation: 'routines'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workouts_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workouts_trainer_id_fkey'
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
          kind: Database['public']['Enums']['package_kind']
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
      add_workout_exercise: {
        Args: { target_exercise_id: string; target_workout_id: string }
        Returns: string
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
      archive_routine: {
        Args: { target_routine_id: string }
        Returns: undefined
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
      can_access_workout: {
        Args: { target_workout_id: string }
        Returns: boolean
      }
      can_edit_workout: {
        Args: { target_workout_id: string }
        Returns: boolean
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
          kind: Database['public']['Enums']['package_kind']
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
      create_lesson_package: {
        Args: {
          activate_now?: boolean
          charge_due_on?: string
          create_charge?: boolean
          requested_expires_on: string
          requested_kind: Database['public']['Enums']['package_kind']
          requested_lesson_count: number
          requested_price_cents: number
          requested_starts_on: string
          target_student_id: string
        }
        Returns: {
          activated_at: string | null
          cancelled_at: string | null
          created_at: string
          expires_on: string
          id: string
          kind: Database['public']['Enums']['package_kind']
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
      discard_workout: {
        Args: { target_workout_id: string }
        Returns: undefined
      }
      display_name: { Args: { target_user_id: string }; Returns: string }
      duplicate_routine: {
        Args: { target_routine_id: string; target_student_id?: string }
        Returns: string
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
      finish_workout: {
        Args: { target_workout_id: string; workout_notes?: string }
        Returns: {
          appointment_id: string | null
          created_at: string
          discarded_at: string | null
          duration_seconds: number | null
          finished_at: string | null
          id: string
          name: string
          notes: string | null
          recorded_by: string
          routine_id: string | null
          started_at: string
          student_id: string
          trainer_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'workouts'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      format_brl: { Args: { cents: number }; Returns: string }
      format_lesson_moment: { Args: { moment: string }; Returns: string }
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
      local_today: { Args: never; Returns: string }
      mark_notifications_read: {
        Args: { target_ids?: string[] }
        Returns: number
      }
      mark_overdue_payments: { Args: never; Returns: number }
      notify_user: {
        Args: {
          notification_body?: string
          notification_kind: Database['public']['Enums']['notification_kind']
          notification_link?: string
          notification_title: string
          target_user_id: string
        }
        Returns: undefined
      }
      previous_set: {
        Args: {
          target_exercise_id: string
          target_position: number
          target_student_id: string
        }
        Returns: {
          reps: number
          weight_kg: number
        }[]
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
      save_routine: { Args: { routine: Json }; Returns: string }
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
      search_exercises: {
        Args: {
          body_part?: string
          equipment?: string
          result_limit?: number
          search_term?: string
        }
        Returns: {
          alias: string
          body_parts: string[]
          equipments: string[]
          external_id: string
          id: string
          name_en: string
          name_pt: string
          secondary_muscles: string[]
          source: Database['public']['Enums']['exercise_source']
          target_muscles: string[]
        }[]
      }
      start_workout: {
        Args: {
          target_appointment_id?: string
          target_routine_id?: string
          target_student_id?: string
          workout_name?: string
        }
        Returns: string
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
      exercise_source: 'exercisedb' | 'custom'
      goal_kind: 'weight' | 'attendance'
      goal_status: 'active' | 'achieved' | 'abandoned'
      invitation_status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
      notification_kind:
        | 'appointment_created'
        | 'appointment_cancelled'
        | 'appointment_rescheduled'
        | 'credits_changed'
        | 'payment_due'
        | 'payment_overdue'
        | 'payment_received'
        | 'goal_created'
        | 'progress_recorded'
        | 'routine_assigned'
        | 'workout_finished'
      package_kind: 'package' | 'single'
      package_status: 'draft' | 'active' | 'exhausted' | 'expired' | 'cancelled'
      payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled'
      photo_position: 'front' | 'side' | 'back'
      relationship_status: 'pending' | 'active' | 'ended'
      workout_set_type: 'normal' | 'warmup' | 'failure'
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
      exercise_source: ['exercisedb', 'custom'],
      goal_kind: ['weight', 'attendance'],
      goal_status: ['active', 'achieved', 'abandoned'],
      invitation_status: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
      notification_kind: [
        'appointment_created',
        'appointment_cancelled',
        'appointment_rescheduled',
        'credits_changed',
        'payment_due',
        'payment_overdue',
        'payment_received',
        'goal_created',
        'progress_recorded',
        'routine_assigned',
        'workout_finished',
      ],
      package_kind: ['package', 'single'],
      package_status: ['draft', 'active', 'exhausted', 'expired', 'cancelled'],
      payment_status: ['pending', 'paid', 'overdue', 'cancelled'],
      photo_position: ['front', 'side', 'back'],
      relationship_status: ['pending', 'active', 'ended'],
      workout_set_type: ['normal', 'warmup', 'failure'],
    },
  },
} as const
