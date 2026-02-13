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
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
                       membership_plan_id UUID REFERENCES membership_plans(id),
                       name TEXT NOT NULL,
                       email TEXT NOT NULL,
                       password_hash TEXT NOT NULL,
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

-- =============================
-- 7️⃣ Dummy data voor MVP
-- =============================

-- Gyms
INSERT INTO gyms (name, email)
VALUES
    ('Submission Grappling Antwerp', 'info@sga.be'),
    ('TK Gym', 'info@tk.be');

-- Membership Plans
INSERT INTO membership_plans (gym_id, name, price, duration_months)
VALUES
    ((SELECT id FROM gyms WHERE name='Submission Grappling Antwerp'), 'Basic', 50, 1),
    ((SELECT id FROM gyms WHERE name='Submission Grappling Antwerp'), 'Unlimited', 80, 1),
    ((SELECT id FROM gyms WHERE name='TK Gym'), 'Standard', 40, 1);

-- Users
INSERT INTO users (gym_id, membership_plan_id, name, email, password_hash, role, membership_expires_at, active)
VALUES
    ((SELECT id FROM gyms WHERE name='Submission Grappling Antwerp'),
     (SELECT id FROM membership_plans WHERE name='Basic' AND gym_id=(SELECT id FROM gyms WHERE name='Submission Grappling Antwerp')),
     'Jan Leden', 'jan@sga.be', 'hashedpassword1', 'member', NOW() + INTERVAL '1 month', true),
    ((SELECT id FROM gyms WHERE name='Submission Grappling Antwerp'),
     (SELECT id FROM membership_plans WHERE name='Unlimited' AND gym_id=(SELECT id FROM gyms WHERE name='Submission Grappling Antwerp')),
     'Sara Coach', 'sara@sga.be', 'hashedpassword2', 'coach', NOW() + INTERVAL '1 month', true),
    ((SELECT id FROM gyms WHERE name='TK Gym'),
     (SELECT id FROM membership_plans WHERE name='Standard' AND gym_id=(SELECT id FROM gyms WHERE name='TK Gym')),
     'Tom Leden', 'tom@tk.be', 'hashedpassword3', 'member', NOW() + INTERVAL '1 month', true);

-- Lessons
INSERT INTO lessons (gym_id, title, capacity, schedule)
VALUES
    ((SELECT id FROM gyms WHERE name='Submission Grappling Antwerp'), 'Beginner Grappling', 10, NOW() + INTERVAL '1 day'),
    ((SELECT id FROM gyms WHERE name='Submission Grappling Antwerp'), 'Advanced Grappling', 15, NOW() + INTERVAL '2 days');

-- Reservations
INSERT INTO reservations (gym_id, user_id, lesson_id, status)
VALUES
    ((SELECT id FROM gyms WHERE name='Submission Grappling Antwerp'),
     (SELECT id FROM users WHERE email='jan@sga.be'),
     (SELECT id FROM lessons WHERE title='Beginner Grappling' AND gym_id=(SELECT id FROM gyms WHERE name='Submission Grappling Antwerp')),
     'booked');

-- Payments
INSERT INTO payments (gym_id, user_id, amount, status, stripe_payment_id)
VALUES
    ((SELECT id FROM gyms WHERE name='Submission Grappling Antwerp'),
     (SELECT id FROM users WHERE email='jan@sga.be'),
     50, 'paid', 'stripe_dummy_1');
