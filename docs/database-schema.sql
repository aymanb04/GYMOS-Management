-- =============================
-- Supabase SaaS-ready DB Setup
-- Created: 2026-02-13
-- =============================


-- 1️⃣ Gyms (tenants)
CREATE TABLE gyms (
                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                      name TEXT NOT NULL,
                      email TEXT UNIQUE,
                      created_at TIMESTAMP DEFAULT NOW()
);

-- 2️⃣ Membership Plans (per gym)
CREATE TABLE membership_plans (
                                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
                                  name TEXT NOT NULL,
                                  price NUMERIC NOT NULL,
                                  duration_months INT NOT NULL,
                                  created_at TIMESTAMP DEFAULT NOW()
);

-- 3️⃣ Users (leden)
CREATE TABLE users (
                        id UUID PRIMARY KEY,  -- komt van Supabase Auth
                        gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
                        membership_plan_id UUID REFERENCES membership_plans(id),
                        name TEXT NOT NULL,
                        email TEXT NOT NULL,
                        role TEXT CHECK (role IN ('admin','coach','member')) DEFAULT 'member',
                        membership_expires_at TIMESTAMP,
                        active BOOLEAN DEFAULT true,
                        created_at TIMESTAMP DEFAULT NOW(),
                        UNIQUE (gym_id, email)
);

-- 4️⃣ Lessons (per gym)
CREATE TABLE lessons (
                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                         gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
                         title TEXT NOT NULL,
                         capacity INT NOT NULL,
                         schedule TIMESTAMP NOT NULL,
                         created_at TIMESTAMP DEFAULT NOW()
);

-- 5️⃣ Reservations (user <-> lesson)
CREATE TABLE reservations (
                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
                              user_id UUID REFERENCES users(id),
                              lesson_id UUID REFERENCES lessons(id),
                              status TEXT CHECK (status IN ('booked','cancelled','attended')) DEFAULT 'booked',
                              created_at TIMESTAMP DEFAULT NOW(),
                              UNIQUE(user_id, lesson_id)
);

-- 6️⃣ Payments
CREATE TABLE payments (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
                          user_id UUID REFERENCES users(id),
                          amount NUMERIC NOT NULL,
                          status TEXT CHECK (status IN ('pending','paid','failed')) DEFAULT 'pending',
                          stripe_payment_id TEXT,
                          created_at TIMESTAMP DEFAULT NOW()
);


--users mogen zichzelf zien
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
               USING (auth.uid() = id);
--users mogen enkel zichzelf updaten
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
               USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
--Select enkel binnen eigen gym
CREATE POLICY "lessons_select_gym"
ON public.lessons
FOR SELECT
               USING (
               gym_id = (
               SELECT gym_id FROM public.users
               WHERE id = auth.uid()
               )
               );
--
CREATE POLICY "membership_plans_select_gym"
ON public.membership_plans
FOR SELECT
               USING (
               gym_id = (
               SELECT gym_id FROM public.users
               WHERE id = auth.uid()
               )
               );
--
CREATE POLICY "reservations_select_gym"
ON public.reservations
FOR SELECT
               USING (
               gym_id = (
               SELECT gym_id FROM public.users
               WHERE id = auth.uid()
               )
               );
--Insert alleen voor eigen gym én eigen user_id
CREATE POLICY "reservations_insert_secure"
ON public.reservations
FOR INSERT
WITH CHECK (
    gym_id = (
        SELECT gym_id FROM public.users
        WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
);
--Update alleen eigen reservatie
CREATE POLICY "reservations_update_own"
ON public.reservations
FOR UPDATE
                      USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
--select binnen eigen gym
CREATE POLICY "payments_select_gym"
ON public.payments
FOR SELECT
               USING (
               gym_id = (
               SELECT gym_id FROM public.users
               WHERE id = auth.uid()
               )
               );
--insert alleen eigen payment
CREATE POLICY "payments_insert_secure"
ON public.payments
FOR INSERT
WITH CHECK (
    gym_id = (
        SELECT gym_id FROM public.users
        WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
);
--User mag enkel eigen gym zien
CREATE POLICY "gyms_select_own"
ON public.gyms
FOR SELECT
                      USING (
                      id = (
                      SELECT gym_id FROM public.users
                      WHERE id = auth.uid()
                      )
                      );
--