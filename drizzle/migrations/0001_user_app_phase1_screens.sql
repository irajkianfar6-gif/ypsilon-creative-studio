-- Identity & bank account (SCR-C-02)
ALTER TABLE public.profiles
  ADD COLUMN national_id text,
  ADD COLUMN birth_date text,
  ADD COLUMN iban text,
  ADD COLUMN account_holder text,
  ADD COLUMN kyc_submitted_at timestamptz;

-- Contract & device (SCR-C-34)
ALTER TABLE public.plants
  ADD COLUMN contract_signed_at timestamptz,
  ADD COLUMN contract_version text,
  ADD COLUMN inverter_serial text,
  ADD COLUMN dongle_id text;

-- Notifications (SCR-C-62)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'action' CHECK (kind IN ('technical','financial','regulatory','action')),
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

-- Support tickets (SCR-C-63)
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plant_id uuid REFERENCES public.plants(id) ON DELETE SET NULL,
  topic text NOT NULL CHECK (topic IN ('technical','financial','case','other')),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','review','referred','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tickets select" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tickets insert" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'open');
CREATE POLICY "own tickets close" ON public.tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND status = 'closed');
CREATE TRIGGER tickets_touch BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author text NOT NULL DEFAULT 'user' CHECK (author IN ('user','support')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ticket messages select" ON public.ticket_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));
CREATE POLICY "own ticket messages insert" ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND author = 'user'
    AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid() AND t.status <> 'closed'));
CREATE INDEX ticket_messages_ticket_idx ON public.ticket_messages (ticket_id, created_at);

-- Data-sharing consents (SCR-C-04)
CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, partner)
);
GRANT SELECT, INSERT, UPDATE ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own consents" ON public.consents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service & maintenance (SCR-C-38)
CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('cleaning','inspection','firmware','fault')),
  preferred_date text,
  note text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','scheduled','done','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own work orders select" ON public.work_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own work orders insert" ON public.work_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'requested'
    AND EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id AND p.user_id = auth.uid()));
CREATE POLICY "own work orders cancel" ON public.work_orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- Automatic notices
CREATE OR REPLACE FUNCTION public.notify_plant_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage > OLD.stage THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (NEW.user_id, 'regulatory', 'پرونده نیروگاه به‌روز شد',
      'مرحله ' || NEW.stage || ' از ۷ تکمیل شد.', '/plant');
  END IF;
  IF NEW.contract_signed_at IS NOT NULL AND OLD.contract_signed_at IS NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (NEW.user_id, 'regulatory', 'قرارداد امضا شد', 'نسخه قرارداد قفل شد و قابل تغییر نیست.', '/contract');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER plants_notify AFTER UPDATE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.notify_plant_stage();

CREATE OR REPLACE FUNCTION public.notify_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (NEW.user_id, 'financial', 'صورتحساب ' || NEW.period_label || ' صادر شد',
    'مبنای صورتحساب: کنتور رسمی توزیع.', '/revenue');
  RETURN NEW;
END; $$;
CREATE TRIGGER settlements_notify AFTER INSERT ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.notify_settlement();

CREATE OR REPLACE FUNCTION public.on_ticket_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ticket_messages (ticket_id, user_id, author, body)
  VALUES (NEW.id, NEW.user_id, 'support',
    'درخواست شما ثبت شد. کارشناس پشتیبانی حداکثر تا یک روز کاری پاسخ می‌دهد. اپراتور فقط برای همین درخواست به پرونده شما دسترسی دارد.');
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (NEW.user_id, 'action', 'تیکت پشتیبانی ثبت شد', NEW.subject, '/support/' || NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER tickets_created AFTER INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.on_ticket_created();

CREATE OR REPLACE FUNCTION public.notify_work_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (NEW.user_id, 'technical', 'درخواست سرویس ثبت شد', 'پس از تخصیص نصاب، زمان بازدید اعلام می‌شود.', '/maintenance');
  RETURN NEW;
END; $$;
CREATE TRIGGER work_orders_notify AFTER INSERT ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.notify_work_order();

REVOKE EXECUTE ON FUNCTION public.notify_plant_stage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_settlement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_ticket_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_work_order() FROM PUBLIC, anon, authenticated;