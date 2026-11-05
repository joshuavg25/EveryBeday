import { db } from './client';
import { toilets, type NewToilet } from './schema';

// Dummy data for local testing. Remove before launch.
const sample: NewToilet[] = [
  {
    name: '[TEST] Seoul City Hall',
    location: { x: 126.9779, y: 37.5663 },
    floor: '1F',
    bidetType: 'electronic_seat',
    access: 'public',
    is24h: false,
    openingHours: 'Mo-Fr 09:00-18:00',
  },
  {
    name: '[TEST] Seoul Station',
    location: { x: 126.9707, y: 37.5547 },
    floor: 'B1',
    bidetType: 'electronic_seat',
    access: 'public',
    is24h: true,
  },
  {
    name: '[TEST] Myeongdong',
    location: { x: 126.9863, y: 37.5609 },
    floor: '2F',
    bidetType: 'both',
    access: 'customers_only',
    is24h: false,
    openingHours: '10:30-22:00',
  },
  {
    name: '[TEST] Gwanghwamun',
    location: { x: 126.9768, y: 37.5759 },
    floor: 'B1',
    bidetType: 'electronic_seat',
    access: 'public',
    is24h: false,
    wheelchair: true,
  },
  {
    name: '[TEST] Hongdae',
    location: { x: 126.9245, y: 37.5572 },
    floor: '3F',
    bidetType: 'hand_sprayer',
    access: 'customers_only',
    is24h: false,
  },
  {
    name: '[TEST] Gangnam Station',
    location: { x: 127.0276, y: 37.4979 },
    floor: 'B2',
    bidetType: 'electronic_seat',
    access: 'public',
    is24h: true,
    wheelchair: true,
  },
  {
    name: '[TEST] Jamsil',
    location: { x: 127.1001, y: 37.5133 },
    floor: 'B1',
    bidetType: 'both',
    access: 'public',
    is24h: false,
  },
];

async function main() {
  const rows = sample.map((t) => ({ ...t, status: 'active' as const }));
  await db.insert(toilets).values(rows);
  console.log(`Inserted ${rows.length} test toilets`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
