-- WheelRev database schema
-- Run this once against a fresh database before running the seed script.

CREATE TABLE IF NOT EXISTS cars (
  id            TEXT PRIMARY KEY,
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  year          INTEGER NOT NULL,
  type          TEXT NOT NULL,
  tier          TEXT NOT NULL CHECK (tier IN ('daily', 'luxury')),
  price         INTEGER NOT NULL,
  origin        TEXT,
  hp            INTEGER,
  range_miles   TEXT,          -- kept as text since EVs use "320 mi" and gas cars use "N/A"
  drivetrain    TEXT,
  seats         INTEGER,
  tagline       TEXT,
  img           TEXT,          -- primary photo URL
  gallery       TEXT[],        -- array of photo URLs (1, 3, or 6 depending on the car)
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cars_brand ON cars (brand);
CREATE INDEX IF NOT EXISTS idx_cars_tier ON cars (tier);
CREATE INDEX IF NOT EXISTS idx_cars_type ON cars (type);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars (price);

-- Reservation requests ("buy" flow). This is a lead-collection flow, not real
-- payment processing — no card data is ever collected or stored here. A real
-- purchase still happens offline between the dealer and the buyer.
CREATE TABLE IF NOT EXISTS orders (
  id                SERIAL PRIMARY KEY,
  car_id            TEXT NOT NULL REFERENCES cars(id),
  car_brand         TEXT NOT NULL,
  car_model         TEXT NOT NULL,
  car_price         INTEGER NOT NULL,
  customer_name     TEXT NOT NULL,
  customer_email    TEXT NOT NULL,
  customer_phone    TEXT,
  financing_pref    TEXT,
  message           TEXT,
  status            TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed', 'cancelled')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
