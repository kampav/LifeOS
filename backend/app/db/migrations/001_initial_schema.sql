-- ============================================================
-- Life OS - Initial Schema
-- Run in Supabase SQL editor or via migration tooling
-- ============================================================

-- Core user profile (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  timezone TEXT DEFAULT 'UTC',
  life_stage TEXT CHECK (life_stage IN ('early_career','established','peak','transition')),
  declared_priorities TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','pro','family','coach','enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domain scores (cached, recomputed by workers)
CREATE TABLE IF NOT EXISTS domain_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  factors JSONB
);

-- Goals (OKR-style)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT DEFAULT 'outcome' CHECK (goal_type IN ('outcome','habit','project','learning')),
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  start_date DATE,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused','abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Universal activity log across all domains
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('metric','note','event','habit_check','mood')),
  title TEXT,
  value NUMERIC,
  unit TEXT,
  data JSONB,
  notes TEXT,
  ai_insight TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT,
  title TEXT,
  messages JSONB DEFAULT '[]',
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal CRM contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT CHECK (relationship IN ('friend','family','colleague','community','mentor','mentee')),
  last_contact_date DATE,
  desired_frequency TEXT CHECK (desired_frequency IN ('weekly','monthly','quarterly','yearly')),
  notes TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits definition
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily',
  target_time TEXT CHECK (target_time IN ('morning','afternoon','evening','anytime')),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit completion logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  logged_date DATE NOT NULL,
  completed BOOLEAN NOT NULL,
  notes TEXT,
  UNIQUE(habit_id, logged_date)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('review_ready','goal_reminder','relationship_check','coach_insight','system')),
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (immutable)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent audit log deletion
CREATE OR REPLACE RULE no_audit_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_entries_user_domain ON entries(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_entries_logged_at ON entries(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_domain ON goals(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_scores_user ON domain_scores(user_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_own_profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "users_own_domain_scores" ON domain_scores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_entries" ON entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_conversations" ON conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_contacts" ON contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_habits" ON habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_habit_logs" ON habit_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on user signup (Supabase trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
