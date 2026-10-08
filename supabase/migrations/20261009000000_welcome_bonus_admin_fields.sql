ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS welcome_bonus_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_bonus_title text NOT NULL DEFAULT 'You have been given a Welcome Bonus by EarnX Finance.',
  ADD COLUMN IF NOT EXISTS welcome_bonus_message text NOT NULL DEFAULT 'Welcome to EarnX-Finance! We are glad to have you. Claim your welcome bonus before it expires and start earning today.';
