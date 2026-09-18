-- Final frontend completion flow support.
-- Safe additive migration: marks the questionnaire used for the welcome flow and
-- prevents the welcome bonus from being claimed until that questionnaire is completed.
ALTER TABLE public.questionnaires
  ADD COLUMN IF NOT EXISTS is_welcome boolean NOT NULL DEFAULT false;

-- Keep at most one welcome questionnaire by moving older welcome flags off when a new
-- one is selected through the admin UI. The client can still edit the flag normally.
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  s public.platform_settings%ROWTYPE;
  bonus numeric;
  welcome_id uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO s FROM public.platform_settings WHERE id;
  IF NOT coalesce(s.welcome_bonus_enabled, true) THEN RETURN jsonb_build_object('ok', false, 'reason', 'disabled'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_profile'); END IF;
  IF p.welcome_bonus_claimed THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed'); END IF;
  SELECT id INTO welcome_id FROM public.questionnaires WHERE is_welcome = true AND active ORDER BY sort_order, created_at LIMIT 1;
  IF welcome_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.questionnaire_completions WHERE user_id = uid AND questionnaire_id = welcome_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'questionnaire_required', 'questionnaire_id', welcome_id);
  END IF;
  bonus := coalesce(s.welcome_bonus, 0);
  UPDATE public.profiles SET balance = balance + bonus, total_earned = total_earned + bonus,
    welcome_bonus_claimed = true, updated_at = now() WHERE id = uid;
  INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (uid, 'welcome_bonus', bonus, 'Welcome bonus', 'completed');
  INSERT INTO public.notifications (user_id, title, body, category)
    VALUES (uid, 'Welcome bonus credited', 'Your welcome bonus has been added to your balance.', 'bonus');
  RETURN jsonb_build_object('ok', true, 'amount', bonus);
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_welcome_bonus() TO authenticated;

-- Receipt storage guard: keep uploads lightweight for the payment-proof bucket.
UPDATE storage.buckets SET file_size_limit = 2097152 WHERE id = 'receipts';

CREATE OR REPLACE FUNCTION public.complete_questionnaire(_questionnaire_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  q public.questionnaires%ROWTYPE;
  reward numeric;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  SELECT * INTO q FROM public.questionnaires WHERE id = _questionnaire_id AND active;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'unavailable'); END IF;
  IF q.starts_at > now() OR (q.ends_at IS NOT NULL AND q.ends_at < now()) THEN RETURN jsonb_build_object('ok', false, 'reason', 'unavailable'); END IF;
  IF jsonb_array_length(coalesce(_answers, '[]'::jsonb)) < jsonb_array_length(coalesce(q.questions,'[]'::jsonb)) THEN RETURN jsonb_build_object('ok', false, 'reason', 'incomplete'); END IF;
  IF EXISTS (SELECT 1 FROM public.questionnaire_completions WHERE user_id = uid AND questionnaire_id = q.id) THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_completed'); END IF;

  reward := CASE WHEN q.is_welcome THEN 0 ELSE coalesce(q.reward, 0) END;
  INSERT INTO public.questionnaire_completions (user_id, questionnaire_id, answers, reward)
    VALUES (uid, q.id, coalesce(_answers, '[]'::jsonb), reward);
  UPDATE public.profiles SET
    balance = balance + reward,
    total_earned = total_earned + reward,
    survey_completed = CASE WHEN q.is_welcome THEN true ELSE survey_completed END,
    updated_at = now()
  WHERE id = uid;
  IF reward > 0 THEN
    INSERT INTO public.transactions (user_id, type, amount, description, status)
      VALUES (uid, 'task', reward, 'Questionnaire: ' || q.title, 'completed');
  END IF;
  RETURN jsonb_build_object('ok', true, 'reward', reward, 'welcome', q.is_welcome);
END; $$;
GRANT EXECUTE ON FUNCTION public.complete_questionnaire(uuid, jsonb) TO authenticated;
