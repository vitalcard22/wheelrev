// Loads the car data from src/data/cars.json into the `cars` table.
// Run this once after creating the database and applying schema.sql:
//   node src/db/seed.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function seed() {
  if (!pool) {
    console.error('DATABASE_URL is not set — cannot seed. Copy .env.example to .env and fill it in first.');
    process.exit(1);
  }

  const carsPath = path.join(__dirname, '..', 'data', 'cars.json');
  const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

  console.log(`Seeding ${cars.length} cars into the database...`);

  let inserted = 0;
  for (const c of cars) {
    await pool.query(
      `INSERT INTO cars (id, brand, model, year, type, tier, price, origin, hp, range_miles, drivetrain, seats, tagline, img, gallery)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
         brand = EXCLUDED.brand, model = EXCLUDED.model, year = EXCLUDED.year, type = EXCLUDED.type,
         tier = EXCLUDED.tier, price = EXCLUDED.price, origin = EXCLUDED.origin, hp = EXCLUDED.hp,
         range_miles = EXCLUDED.range_miles, drivetrain = EXCLUDED.drivetrain, seats = EXCLUDED.seats,
         tagline = EXCLUDED.tagline, img = EXCLUDED.img, gallery = EXCLUDED.gallery, updated_at = now()`,
      [
        c.id, c.brand, c.model, c.year, c.type, c.tier, c.price, c.origin || null,
        c.hp || null, c.range || null, c.drivetrain || null, c.seats || null,
        c.tagline || null, c.img || null, c.gallery || [],
      ]
    );
    inserted++;
  }

  console.log(`Done. ${inserted} cars inserted/updated.`);
  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
