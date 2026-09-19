export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activation_requests: {
        Row: {
          admin_note: string | null;
          amount: number;
          created_at: string;
          id: string;
          payer_name: string | null;
          proof_url: string | null;
          reference: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["activation_status"];
          user_id: string;
        };
        Insert: {
          admin_note?: string | null;
          amount: number;
          created_at?: string;
          id?: string;
          payer_name?: string | null;
          proof_url?: string | null;
          reference?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["activation_status"];
          user_id: string;
        };
        Update: {
          admin_note?: string | null;
          amount?: number;
          created_at?: string;
          id?: string;
          payer_name?: string | null;
          proof_url?: string | null;
          reference?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["activation_status"];
          user_id?: string;
        };
        Relationships: [];
      };
      admin_logs: {
        Row: {
          action: string;
          admin_id: string | null;
          admin_name: string;
          created_at: string;
          details: Json;
          id: string;
          ip_address: string | null;
          target_user: string | null;
        };
        Insert: {
          action: string;
          admin_id?: string | null;
          admin_name?: string;
          created_at?: string;
          details?: Json;
          id?: string;
          ip_address?: string | null;
          target_user?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string | null;
          admin_name?: string;
          created_at?: string;
          details?: Json;
          id?: string;
          ip_address?: string | null;
          target_user?: string | null;
        };
        Relationships: [];
      };
      book_completions: {
        Row: {
          book_id: string;
          created_at: string;
          id: string;
          reward: number;
          user_id: string;
        };
        Insert: {
          book_id: string;
          created_at?: string;
          id?: string;
          reward?: number;
          user_id: string;
        };
        Update: {
          book_id?: string;
          created_at?: string;
          id?: string;
          reward?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "book_completions_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      books: {
        Row: {
          active: boolean;
          author: string | null;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          file_type: string;
          file_url: string;
          id: string;
          min_read_seconds: number;
          reward: number;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          author?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          file_type?: string;
          file_url: string;
          id?: string;
          min_read_seconds?: number;
          reward?: number;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          author?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          file_type?: string;
          file_url?: string;
          id?: string;
          min_read_seconds?: number;
          reward?: number;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_bonus_claims: {
        Row: {
          amount: number;
          claimed_on: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          claimed_on?: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          claimed_on?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      fraud_reports: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          phone: string;
          scammer_name: string;
          screenshot_url: string | null;
          social_link: string;
          status: string;
          telegram: string;
          updated_at: string;
          user_id: string | null;
          whatsapp: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          phone?: string;
          scammer_name?: string;
          screenshot_url?: string | null;
          social_link?: string;
          status?: string;
          telegram?: string;
          updated_at?: string;
          user_id?: string | null;
          whatsapp?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          phone?: string;
          scammer_name?: string;
          screenshot_url?: string | null;
          social_link?: string;
          status?: string;
          telegram?: string;
          updated_at?: string;
          user_id?: string | null;
          whatsapp?: string;
        };
        Relationships: [];
      };
      levels: {
        Row: {
          activation_fee: number;
          battery_capacity: number;
          benefits: string[];
          cooldown_minutes: number;
          daily_earnings_limit: number;
          daily_recharge_limit: number;
          daily_recharge_reset_hours: number;
          daily_tap_limit: number;
          daily_withdrawal_limit: number;
          enabled: boolean;
          level: number;
          max_withdrawal: number;
          max_withdrawals_per_day: number;
          min_withdrawal: number;
          name: string;
          processing_time: string;
          recharge_amount: number;
          recharge_minutes: number;
          referral_reward: number;
          reward_per_tap: number;
          tap_multiplier: number;
          unlimited_battery: boolean;
          unlimited_taps: boolean;
          updated_at: string;
          upgrade_price: number;
        };
        Insert: {
          activation_fee?: number;
          battery_capacity?: number;
          benefits?: string[];
          cooldown_minutes?: number;
          daily_earnings_limit?: number;
          daily_recharge_limit?: number;
          daily_recharge_reset_hours?: number;
          daily_tap_limit?: number;
          daily_withdrawal_limit?: number;
          enabled?: boolean;
          level: number;
          max_withdrawal?: number;
          max_withdrawals_per_day?: number;
          min_withdrawal?: number;
          name: string;
          processing_time?: string;
          recharge_amount?: number;
          recharge_minutes?: number;
          referral_reward?: number;
          reward_per_tap?: number;
          tap_multiplier?: number;
          unlimited_battery?: boolean;
          unlimited_taps?: boolean;
          updated_at?: string;
          upgrade_price?: number;
        };
        Update: {
          activation_fee?: number;
          battery_capacity?: number;
          benefits?: string[];
          cooldown_minutes?: number;
          daily_earnings_limit?: number;
          daily_recharge_limit?: number;
          daily_recharge_reset_hours?: number;
          daily_tap_limit?: number;
          daily_withdrawal_limit?: number;
          enabled?: boolean;
          level?: number;
          max_withdrawal?: number;
          max_withdrawals_per_day?: number;
          min_withdrawal?: number;
          name?: string;
          processing_time?: string;
          recharge_amount?: number;
          recharge_minutes?: number;
          referral_reward?: number;
          reward_per_tap?: number;
          tap_multiplier?: number;
          unlimited_battery?: boolean;
          unlimited_taps?: boolean;
          updated_at?: string;
          upgrade_price?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string;
          category: string;
          created_at: string;
          id: string;
          link: string | null;
          read: boolean;
          title: string;
          user_id: string | null;
        };
        Insert: {
          body?: string;
          category?: string;
          created_at?: string;
          id?: string;
          link?: string | null;
          read?: boolean;
          title: string;
          user_id?: string | null;
        };
        Update: {
          body?: string;
          category?: string;
          created_at?: string;
          id?: string;
          link?: string | null;
          read?: boolean;
          title?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          account_name: string;
          account_number: string;
          activation_auto_approve: boolean;
          activation_fee: number;
          activation_instructions: string;
          activation_required: boolean;
          announcement: string | null;
          anti_scam_reminder: string;
          bank_name: string;
          battery_enabled: boolean;
          business_hours: string;
          cooldown_enabled: boolean;
          copy_button_text: string;
          daily_bonus_amount: number;
          daily_bonus_cooldown_hours: number;
          daily_bonus_enabled: boolean;
          default_reward_per_tap: number;
          event_multiplier: number;
          event_multiplier_enabled: boolean;
          facebook_url: string;
          footer_text: string;
          hero_subtitle: string;
          hero_title: string;
          id: boolean;
          instagram_url: string;
          landing_faq: Json;
          landing_features: Json;
          landing_stats: Json;
          logo_url: string | null;
          maintenance_enabled: boolean;
          maintenance_eta: string;
          maintenance_message: string;
          max_tap_reward: number;
          max_withdrawal: number;
          max_withdrawals_per_day: number;
          min_tap_reward: number;
          min_withdrawal: number;
          office_address: string;
          payment_instructions: string;
          promotions_enabled: boolean;
          questionnaires_enabled: boolean;
          reading_enabled: boolean;
          referral_commission: number;
          referral_conditions: string;
          referral_reward: number;
          security_notice: string;
          social_links: Json;
          support_email: string;
          support_phone: string;
          supported_banks: string[];
          tap_multiplier: number;
          tapping_enabled: boolean;
          tasks_enabled: boolean;
          telegram_url: string;
          tour_enabled: boolean;
          twitter_url: string;
          unlimited_taps: boolean;
          updated_at: string;
          upgrade_requires_activation: boolean;
          upgrade_requires_receipt: boolean;
          videos_enabled: boolean;
          weekend_multiplier: number;
          weekend_multiplier_enabled: boolean;
          welcome_bonus: number;
          welcome_bonus_enabled: boolean;
          whatsapp_number: string;
          withdrawal_daily_limit: number;
          withdrawal_instructions: string;
          withdrawal_processing_time: string;
          withdrawal_requires_activation: boolean;
          withdrawals_enabled: boolean;
        };
        Insert: {
          account_name?: string;
          account_number?: string;
          activation_auto_approve?: boolean;
          activation_fee?: number;
          activation_instructions?: string;
          activation_required?: boolean;
          announcement?: string | null;
          anti_scam_reminder?: string;
          bank_name?: string;
          battery_enabled?: boolean;
          business_hours?: string;
          cooldown_enabled?: boolean;
          copy_button_text?: string;
          daily_bonus_amount?: number;
          daily_bonus_cooldown_hours?: number;
          daily_bonus_enabled?: boolean;
          default_reward_per_tap?: number;
          event_multiplier?: number;
          event_multiplier_enabled?: boolean;
          facebook_url?: string;
          footer_text?: string;
          hero_subtitle?: string;
          hero_title?: string;
          id?: boolean;
          instagram_url?: string;
          landing_faq?: Json;
          landing_features?: Json;
          landing_stats?: Json;
          logo_url?: string | null;
          maintenance_enabled?: boolean;
          maintenance_eta?: string;
          maintenance_message?: string;
          max_tap_reward?: number;
          max_withdrawal?: number;
          max_withdrawals_per_day?: number;
          min_tap_reward?: number;
          min_withdrawal?: number;
          office_address?: string;
          payment_instructions?: string;
          promotions_enabled?: boolean;
          questionnaires_enabled?: boolean;
          reading_enabled?: boolean;
          referral_commission?: number;
          referral_conditions?: string;
          referral_reward?: number;
          security_notice?: string;
          social_links?: Json;
          support_email?: string;
          support_phone?: string;
          supported_banks?: string[];
          tap_multiplier?: number;
          tapping_enabled?: boolean;
          tasks_enabled?: boolean;
          telegram_url?: string;
          tour_enabled?: boolean;
          twitter_url?: string;
          unlimited_taps?: boolean;
          updated_at?: string;
          upgrade_requires_activation?: boolean;
          upgrade_requires_receipt?: boolean;
          videos_enabled?: boolean;
          weekend_multiplier?: number;
          weekend_multiplier_enabled?: boolean;
          welcome_bonus?: number;
          welcome_bonus_enabled?: boolean;
          whatsapp_number?: string;
          withdrawal_daily_limit?: number;
          withdrawal_instructions?: string;
          withdrawal_processing_time?: string;
          withdrawal_requires_activation?: boolean;
          withdrawals_enabled?: boolean;
        };
        Update: {
          account_name?: string;
          account_number?: string;
          activation_auto_approve?: boolean;
          activation_fee?: number;
          activation_instructions?: string;
          activation_required?: boolean;
          announcement?: string | null;
          anti_scam_reminder?: string;
          bank_name?: string;
          battery_enabled?: boolean;
          business_hours?: string;
          cooldown_enabled?: boolean;
          copy_button_text?: string;
          daily_bonus_amount?: number;
          daily_bonus_cooldown_hours?: number;
          daily_bonus_enabled?: boolean;
          default_reward_per_tap?: number;
          event_multiplier?: number;
          event_multiplier_enabled?: boolean;
          facebook_url?: string;
          footer_text?: string;
          hero_subtitle?: string;
          hero_title?: string;
          id?: boolean;
          instagram_url?: string;
          landing_faq?: Json;
          landing_features?: Json;
          landing_stats?: Json;
          logo_url?: string | null;
          maintenance_enabled?: boolean;
          maintenance_eta?: string;
          maintenance_message?: string;
          max_tap_reward?: number;
          max_withdrawal?: number;
          max_withdrawals_per_day?: number;
          min_tap_reward?: number;
          min_withdrawal?: number;
          office_address?: string;
          payment_instructions?: string;
          promotions_enabled?: boolean;
          questionnaires_enabled?: boolean;
          reading_enabled?: boolean;
          referral_commission?: number;
          referral_conditions?: string;
          referral_reward?: number;
          security_notice?: string;
          social_links?: Json;
          support_email?: string;
          support_phone?: string;
          supported_banks?: string[];
          tap_multiplier?: number;
          tapping_enabled?: boolean;
          tasks_enabled?: boolean;
          telegram_url?: string;
          tour_enabled?: boolean;
          twitter_url?: string;
          unlimited_taps?: boolean;
          updated_at?: string;
          upgrade_requires_activation?: boolean;
          upgrade_requires_receipt?: boolean;
          videos_enabled?: boolean;
          weekend_multiplier?: number;
          weekend_multiplier_enabled?: boolean;
          welcome_bonus?: number;
          welcome_bonus_enabled?: boolean;
          whatsapp_number?: string;
          withdrawal_daily_limit?: number;
          withdrawal_instructions?: string;
          withdrawal_processing_time?: string;
          withdrawal_requires_activation?: boolean;
          withdrawals_enabled?: boolean;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"];
          activation: Database["public"]["Enums"]["activation_status"];
          admin_notes: string | null;
          avatar_url: string | null;
          balance: number;
          bank_account_name: string | null;
          bank_account_number: string | null;
          bank_name: string | null;
          battery: number;
          battery_updated_at: string;
          cooldown_until: string | null;
          country: string;
          created_at: string;
          earned_today: number;
          email: string;
          first_name: string;
          id: string;
          last_login_at: string | null;
          level: number;
          other_names: string;
          pending_balance: number;
          phone: string;
          recharges_today: number;
          referral_code: string;
          referred_by: string | null;
          state: string;
          survey_completed: boolean;
          survey_skipped: boolean;
          tap_day: string;
          taps_today: number;
          total_earned: number;
          total_taps: number;
          tour_completed: boolean;
          updated_at: string;
          username: string;
          welcome_bonus_claimed: boolean;
          withdrawal_pin_hash: string | null;
        };
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"];
          activation?: Database["public"]["Enums"]["activation_status"];
          admin_notes?: string | null;
          avatar_url?: string | null;
          balance?: number;
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_name?: string | null;
          battery?: number;
          battery_updated_at?: string;
          cooldown_until?: string | null;
          country?: string;
          created_at?: string;
          earned_today?: number;
          email: string;
          first_name?: string;
          id: string;
          last_login_at?: string | null;
          level?: number;
          other_names?: string;
          pending_balance?: number;
          phone?: string;
          recharges_today?: number;
          referral_code: string;
          referred_by?: string | null;
          state?: string;
          survey_completed?: boolean;
          survey_skipped?: boolean;
          tap_day?: string;
          taps_today?: number;
          total_earned?: number;
          total_taps?: number;
          tour_completed?: boolean;
          updated_at?: string;
          username: string;
          welcome_bonus_claimed?: boolean;
          withdrawal_pin_hash?: string | null;
        };
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"];
          activation?: Database["public"]["Enums"]["activation_status"];
          admin_notes?: string | null;
          avatar_url?: string | null;
          balance?: number;
          bank_account_name?: string | null;
          bank_account_number?: string | null;
          bank_name?: string | null;
          battery?: number;
          battery_updated_at?: string;
          cooldown_until?: string | null;
          country?: string;
          created_at?: string;
          earned_today?: number;
          email?: string;
          first_name?: string;
          id?: string;
          last_login_at?: string | null;
          level?: number;
          other_names?: string;
          pending_balance?: number;
          phone?: string;
          recharges_today?: number;
          referral_code?: string;
          referred_by?: string | null;
          state?: string;
          survey_completed?: boolean;
          survey_skipped?: boolean;
          tap_day?: string;
          taps_today?: number;
          total_earned?: number;
          total_taps?: number;
          tour_completed?: boolean;
          updated_at?: string;
          username?: string;
          welcome_bonus_claimed?: boolean;
          withdrawal_pin_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_level_fkey";
            columns: ["level"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["level"];
          },
          {
            foreignKeyName: "profiles_referred_by_fkey";
            columns: ["referred_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      promotions: {
        Row: {
          active: boolean;
          banner_url: string | null;
          created_at: string;
          description: string;
          ends_at: string;
          id: string;
          reward_details: string;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          banner_url?: string | null;
          created_at?: string;
          description?: string;
          ends_at?: string;
          id?: string;
          reward_details?: string;
          starts_at?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          banner_url?: string | null;
          created_at?: string;
          description?: string;
          ends_at?: string;
          id?: string;
          reward_details?: string;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      questionnaire_completions: {
        Row: {
          answers: Json;
          created_at: string;
          id: string;
          questionnaire_id: string;
          reward: number;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          created_at?: string;
          id?: string;
          questionnaire_id: string;
          reward?: number;
          user_id: string;
        };
        Update: {
          answers?: Json;
          created_at?: string;
          id?: string;
          questionnaire_id?: string;
          reward?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questionnaire_completions_questionnaire_id_fkey";
            columns: ["questionnaire_id"];
            isOneToOne: false;
            referencedRelation: "questionnaires";
            referencedColumns: ["id"];
          },
        ];
      };
      questionnaires: {
        Row: {
          active: boolean;
          created_at: string;
          description: string;
          ends_at: string | null;
          id: string;
          image_url: string | null;
          questions: Json;
          reward: number;
          sort_order: number;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          questions?: Json;
          reward?: number;
          sort_order?: number;
          starts_at?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          questions?: Json;
          reward?: number;
          sort_order?: number;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          created_at: string;
          id: string;
          referred_id: string;
          referrer_id: string;
          reward: number;
          rewarded_at: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          referred_id: string;
          referrer_id: string;
          reward?: number;
          rewarded_at?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          referred_id?: string;
          referrer_id?: string;
          reward?: number;
          rewarded_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      support_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          sender: string;
          ticket_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          sender?: string;
          ticket_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          sender?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          admin_reply: string | null;
          created_at: string;
          description: string;
          id: string;
          screenshot_url: string | null;
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_reply?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          screenshot_url?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_reply?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          screenshot_url?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      task_completions: {
        Row: {
          completed_on: string;
          created_at: string;
          id: string;
          reward: number;
          task_id: string;
          user_id: string;
        };
        Insert: {
          completed_on?: string;
          created_at?: string;
          id?: string;
          reward?: number;
          task_id: string;
          user_id: string;
        };
        Update: {
          completed_on?: string;
          created_at?: string;
          id?: string;
          reward?: number;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          action_url: string | null;
          active: boolean;
          category: string;
          created_at: string;
          description: string;
          duration_seconds: number;
          expires_at: string | null;
          id: string;
          min_level: number;
          requires_activation: boolean;
          reward: number;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          action_url?: string | null;
          active?: boolean;
          category?: string;
          created_at?: string;
          description?: string;
          duration_seconds?: number;
          expires_at?: string | null;
          id?: string;
          min_level?: number;
          requires_activation?: boolean;
          reward?: number;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          action_url?: string | null;
          active?: boolean;
          category?: string;
          created_at?: string;
          description?: string;
          duration_seconds?: number;
          expires_at?: string | null;
          id?: string;
          min_level?: number;
          requires_activation?: boolean;
          reward?: number;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          id: string;
          name: string;
          quote: string;
          rating: number;
          role: string;
          sort_order: number;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          quote: string;
          rating?: number;
          role?: string;
          sort_order?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          quote?: string;
          rating?: number;
          role?: string;
          sort_order?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          created_at: string;
          description: string;
          id: string;
          metadata: Json;
          reference: string | null;
          status: Database["public"]["Enums"]["transaction_status"];
          type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          description?: string;
          id?: string;
          metadata?: Json;
          reference?: string | null;
          status?: Database["public"]["Enums"]["transaction_status"];
          type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          description?: string;
          id?: string;
          metadata?: Json;
          reference?: string | null;
          status?: Database["public"]["Enums"]["transaction_status"];
          type?: Database["public"]["Enums"]["transaction_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      upgrade_requests: {
        Row: {
          admin_note: string | null;
          amount: number;
          created_at: string;
          from_level: number;
          id: string;
          payer_name: string | null;
          proof_url: string | null;
          reference: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          to_level: number;
          user_id: string;
        };
        Insert: {
          admin_note?: string | null;
          amount: number;
          created_at?: string;
          from_level: number;
          id?: string;
          payer_name?: string | null;
          proof_url?: string | null;
          reference?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          to_level: number;
          user_id: string;
        };
        Update: {
          admin_note?: string | null;
          amount?: number;
          created_at?: string;
          from_level?: number;
          id?: string;
          payer_name?: string | null;
          proof_url?: string | null;
          reference?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          to_level?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      video_completions: {
        Row: {
          completed_on: string;
          created_at: string;
          id: string;
          reward: number;
          user_id: string;
          video_id: string;
        };
        Insert: {
          completed_on?: string;
          created_at?: string;
          id?: string;
          reward?: number;
          user_id: string;
          video_id: string;
        };
        Update: {
          completed_on?: string;
          created_at?: string;
          id?: string;
          reward?: number;
          user_id?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_completions_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "videos";
            referencedColumns: ["id"];
          },
        ];
      };
      videos: {
        Row: {
          active: boolean;
          created_at: string;
          daily_repeat: boolean;
          description: string;
          id: string;
          reward: number;
          sort_order: number;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
          video_url: string;
          watch_seconds: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          daily_repeat?: boolean;
          description?: string;
          id?: string;
          reward?: number;
          sort_order?: number;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
          video_url: string;
          watch_seconds?: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          daily_repeat?: boolean;
          description?: string;
          id?: string;
          reward?: number;
          sort_order?: number;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
          video_url?: string;
          watch_seconds?: number;
        };
        Relationships: [];
      };
      welcome_surveys: {
        Row: {
          age: string;
          country: string;
          created_at: string;
          employment_status: string;
          heard_from: string;
          id: string;
          income_range: string;
          postal_code: string | null;
          state: string;
          user_id: string;
        };
        Insert: {
          age: string;
          country: string;
          created_at?: string;
          employment_status: string;
          heard_from: string;
          id?: string;
          income_range: string;
          postal_code?: string | null;
          state: string;
          user_id: string;
        };
        Update: {
          age?: string;
          country?: string;
          created_at?: string;
          employment_status?: string;
          heard_from?: string;
          id?: string;
          income_range?: string;
          postal_code?: string | null;
          state?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      withdrawals: {
        Row: {
          account_name: string;
          account_number: string;
          admin_note: string | null;
          amount: number;
          bank_name: string;
          created_at: string;
          id: string;
          reference: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["withdrawal_status"];
          user_id: string;
        };
        Insert: {
          account_name: string;
          account_number: string;
          admin_note?: string | null;
          amount: number;
          bank_name: string;
          created_at?: string;
          id?: string;
          reference: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["withdrawal_status"];
          user_id: string;
        };
        Update: {
          account_name?: string;
          account_number?: string;
          admin_note?: string | null;
          amount?: number;
          bank_name?: string;
          created_at?: string;
          id?: string;
          reference?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["withdrawal_status"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_adjust_balance: {
        Args: { _amount: number; _reason: string; _user_id: string };
        Returns: Json;
      };
      admin_reply_ticket: {
        Args: { _reply: string; _status?: string; _ticket_id: string };
        Returns: Json;
      };
      admin_requests: { Args: { _kind: string }; Returns: Json };
      admin_reset_user: {
        Args: { _user_id: string; _what: string };
        Returns: Json;
      };
      admin_review_activation: {
        Args: { _approve: boolean; _note?: string; _request_id: string };
        Returns: Json;
      };
      admin_review_upgrade: {
        Args: { _approve: boolean; _note?: string; _request_id: string };
        Returns: Json;
      };
      admin_review_withdrawal: {
        Args: {
          _note?: string;
          _status: Database["public"]["Enums"]["withdrawal_status"];
          _withdrawal_id: string;
        };
        Returns: Json;
      };
      admin_send_notification: {
        Args: {
          _audience: string;
          _body: string;
          _category?: string;
          _title: string;
          _user_id: string;
        };
        Returns: Json;
      };
      admin_set_account_status: {
        Args: {
          _status: Database["public"]["Enums"]["account_status"];
          _user_id: string;
        };
        Returns: Json;
      };
      admin_set_fraud_status: {
        Args: { _report_id: string; _status: string };
        Returns: Json;
      };
      admin_set_note: {
        Args: { _note: string; _user_id: string };
        Returns: Json;
      };
      admin_stats: { Args: never; Returns: Json };
      admin_upgrade_requests: {
        Args: { _search?: string; _status?: string };
        Returns: Json;
      };
      claim_daily_bonus: { Args: never; Returns: Json };
      claim_welcome_bonus: { Args: never; Returns: Json };
      complete_book: {
        Args: { _book_id: string; _read_seconds: number };
        Returns: Json;
      };
      complete_questionnaire: {
        Args: { _answers: Json; _questionnaire_id: string };
        Returns: Json;
      };
      complete_task: { Args: { _task_id: string }; Returns: Json };
      complete_tour: { Args: never; Returns: Json };
      complete_video: {
        Args: { _video_id: string; _watched_seconds: number };
        Returns: Json;
      };
      email_for_username: { Args: { _username: string }; Returns: string };
      ensure_admin_role: { Args: never; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_official_admin_email: { Args: { _email: string }; Returns: boolean };
      perform_tap: { Args: never; Returns: Json };
      request_withdrawal: {
        Args: {
          _account_name: string;
          _account_number: string;
          _amount: number;
          _bank_name: string;
        };
        Returns: Json;
      };
      restart_tour: { Args: never; Returns: Json };
      settle_referral: { Args: { _user: string }; Returns: undefined };
      submit_activation: {
        Args: { _payer_name: string; _proof_url: string; _reference: string };
        Returns: Json;
      };
      submit_upgrade_request: {
        Args: {
          _level: number;
          _payer_name: string;
          _proof_url: string;
          _reference: string;
        };
        Returns: Json;
      };
      tap_state: { Args: never; Returns: Json };
      upgrade_level: { Args: { _level: number }; Returns: Json };
    };
    Enums: {
      account_status: "active" | "suspended" | "banned";
      activation_status: "not_activated" | "pending" | "activated" | "rejected";
      app_role: "admin" | "moderator" | "user";
      ticket_status: "open" | "pending" | "closed";
      transaction_status: "pending" | "completed" | "failed" | "reversed";
      transaction_type:
        | "tap"
        | "task"
        | "referral"
        | "welcome_bonus"
        | "promotion"
        | "upgrade"
        | "activation"
        | "withdrawal"
        | "admin_adjustment"
        | "loyalty";
      withdrawal_status: "processing" | "approved" | "completed" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "banned"],
      activation_status: ["not_activated", "pending", "activated", "rejected"],
      app_role: ["admin", "moderator", "user"],
      ticket_status: ["open", "pending", "closed"],
      transaction_status: ["pending", "completed", "failed", "reversed"],
      transaction_type: [
        "tap",
        "task",
        "referral",
        "welcome_bonus",
        "promotion",
        "upgrade",
        "activation",
        "withdrawal",
        "admin_adjustment",
        "loyalty",
      ],
      withdrawal_status: ["processing", "approved", "completed", "rejected"],
    },
  },
} as const;
