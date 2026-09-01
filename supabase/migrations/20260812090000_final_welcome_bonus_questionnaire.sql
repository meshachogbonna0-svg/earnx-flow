-- Final welcome questionnaire + welcome bonus flow.
-- Completing the active welcome questionnaire also credits the configured welcome bonus once.
CREATE OR REPLACE FUNCTION public.complete_questionnaire(_questionnaire_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  q public.questionnaires%ROWTYPE;
  s public.platform_settings%ROWTYPE;
  p public.profiles%ROWTYPE;
  welcome numeric := 0;
  questionnaire_reward numeric := 0;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;

  SELECT * INTO s FROM public.platform_settings WHERE id;
  SELECT * INTO p FROM public.profiles WHERE id = uid FOR UPDATE;

  IF NOT coalesce(s.questionnaires_enabled, true) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'disabled');
  END IF;

  SELECT * INTO q FROM public.questionnaires
  WHERE id = _questionnaire_id AND active;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'unavailable'); END IF;
  IF q.starts_at > now() OR (q.ends_at IS NOT NULL AND q.ends_at < now()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unavailable');
  END IF;

  IF jsonb_array_length(coalesce(_answers, '[]'::jsonb))
     < jsonb_array_length(coalesce(q.questions,'[]'::jsonb)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'incomplete');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.questionnaire_completions
    WHERE user_id = uid AND questionnaire_id = q.id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed');
  END IF;

  questionnaire_reward := greatest(coalesce(q.reward, 0), 0);
  welcome := CASE
    WHEN coalesce(p.welcome_bonus_claimed, false) THEN 0
    WHEN coalesce(s.welcome_bonus_enabled, true) THEN greatest(coalesce(s.welcome_bonus, 0), 0)
    ELSE 0
  END;

  INSERT INTO public.questionnaire_completions (user_id, questionnaire_id, answers, reward)
  VALUES (uid, q.id, coalesce(_answers, '[]'::jsonb), questionnaire_reward);

  UPDATE public.profiles
  SET
    balance = balance + questionnaire_reward + welcome,
    total_earned = total_earned + questionnaire_reward + welcome,
    survey_completed = true,
    welcome_bonus_claimed = CASE WHEN welcome > 0 THEN true ELSE welcome_bonus_claimed END,
    updated_at = now()
  WHERE id = uid;

  IF questionnaire_reward > 0 THEN
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (uid, 'task', questionnaire_reward, 'Questionnaire: ' || q.title, 'completed');
  END IF;

  IF welcome > 0 THEN
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (uid, 'welcome_bonus', welcome, 'Welcome bonus after questionnaire', 'completed');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reward', questionnaire_reward,
    'welcome_bonus', welcome,
    'total_reward', questionnaire_reward + welcome
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_questionnaire(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_questionnaire(uuid, jsonb) TO authenticated;
