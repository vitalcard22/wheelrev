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
