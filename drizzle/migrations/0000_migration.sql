-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  city text DEFAULT 'اصفهان',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Versioned rate table (Regulation-as-Configuration)
CREATE TABLE public.rate_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  title text NOT NULL,
  rate_rial_per_kwh numeric NOT NULL,
  contract_years int NOT NULL,
  settlement_delay text,
  condition text,
  version text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rate_table TO authenticated;
GRANT ALL ON public.rate_table TO service_role;
ALTER TABLE public.rate_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read active rates" ON public.rate_table FOR SELECT TO authenticated USING (active = true);

INSERT INTO public.rate_table (channel, title, rate_rial_per_kwh, contract_years, settlement_delay, condition, version, sort_order) VALUES
('guaranteed_battery', 'خرید تضمینی باتری‌دار', 91169, 20, '۲ تا ۳ ماه', 'باتری حداقل ۷٫۵ kWh', 'آبان ۱۴۰۵ نسخه ۳', 1),
('guaranteed', 'خرید تضمینی پایه', 45850, 20, '۲ تا ۳ ماه', 'اتصال به شبکه', 'آبان ۱۴۰۵ نسخه ۳', 2),
('self', 'خودتأمین', 49870, 25, 'صرفه‌جویی در قبض', 'مصرف در محل', 'آبان ۱۴۰۵ نسخه ۳', 3);

-- Bills
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bill_number text NOT NULL,
  period_label text NOT NULL,
  peak_kwh numeric NOT NULL DEFAULT 0,
  mid_kwh numeric NOT NULL DEFAULT 0,
  offpeak_kwh numeric NOT NULL DEFAULT 0,
  amount_rial numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT ALL ON public.bills TO service_role;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bills" ON public.bills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Plants
CREATE TABLE public.plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tracking_code text NOT NULL DEFAULT ('۰۴۱۲-' || lpad((floor(random()*99999))::int::text, 5, '0')),
  name text NOT NULL DEFAULT 'نیروگاه من',
  city text NOT NULL DEFAULT 'اصفهان',
  capacity_kw numeric NOT NULL,
  panel_count int NOT NULL,
  panel_watt int NOT NULL DEFAULT 550,
  inverter text NOT NULL,
  roof_area_m2 numeric NOT NULL,
  orientation text NOT NULL DEFAULT 'جنوب، ۳۰ درجه',
  has_battery boolean NOT NULL DEFAULT false,
  annual_kwh numeric NOT NULL,
  channel text,
  loan_amount_rial numeric,
  loan_months int,
  supplier text,
  quote_rial numeric,
  stage int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plants TO authenticated;
GRANT ALL ON public.plants TO service_role;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plants" ON public.plants FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Settlements (monthly revenue statements)
CREATE TABLE public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  energy_kwh numeric NOT NULL,
  inverter_kwh numeric NOT NULL,
  rate_rial numeric NOT NULL,
  amount_rial numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  dispute_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settlements TO authenticated;
GRANT ALL ON public.settlements TO service_role;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settlements" ON public.settlements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER plants_touch BEFORE UPDATE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();