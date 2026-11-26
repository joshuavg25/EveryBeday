import { like } from 'drizzle-orm';
import { db } from './client';
import { toilets, type NewToilet } from './schema';

// Dummy data for local testing. Every name starts with [TEST] so the rows are easy to find.
// Remove them before launch with: npm run db:seed -- --clear
const sample: NewToilet[] = [
  {
    name: '[TEST] Seoul City Hall',
    nameKo: '[TEST] 서울시청',
    location: { x: 126.9779, y: 37.5663 },
    floor: '1F',
    bidetType: 'electronic_seat',
    access: 'public',
    is24h: false,
    openingHours: 'Mo-Fr 09:00-18:00',
  },
  {
    name: '[TEST] Seoul Station',
    nameKo: '[TEST] 서울역',
    location: { x: 126.9707, y: 37.5547 },
    floor: 'B1',
    bidetType: 'electronic_seat',
    access: 'public',
    is24h: true,
  },
  {
    name: '[TEST] Myeongdong',
    nameKo: '[TEST] 명동',
    location: { x: 126.9863, y: 37.5609 },
    floor: '2F',
    bidetType: 'both',
    access: 'customers_only',
    is24h: false,
    openingHours: '10:30-22:00',
    note: 'Ask the staff for the door code',
  },
  {
    name: '[TEST] Gwanghwamun',
    nameKo: '[TEST] 광화문',
    location: { x: 126.9768, y: 37.5759 },
    floor: 'B1',
    bidetType: 'electronic_seat',
    access: 'public',
    is24h: false,
    wheelchair: true,
  },
  {
    name: '[TEST] Hongdae',
    nameKo: '[TEST] 홍대',
    location: { x: 126.9245, y: 37.5572 },
    floor: '3F',
    bidetType: 'hand_sprayer',
    access: 'customers_only',
    is24h: false,
  },
  {
    name: '[TEST] Gangnam Station',
    nameKo: '[TEST] 강남역',
    location: { x: 127.0276, y: 37.4979 },
    floor: 'B2',
    bidetType: 'electronic_seat',
    access: 'public',
    gender: 'female',
    is24h: true,
    wheelchair: true,
  },
  {
    // No Korean name: shows how the Korean site falls back to the English name
    name: '[TEST] Jamsil',
    location: { x: 127.1001, y: 37.5133 },
    floor: 'B1',
    bidetType: 'both',
    access: 'public',
    is24h: false,
  },
];

async function main() {
  // Running the seed twice must not create duplicates: clear the old test rows first
  const removed = await db
    .delete(toilets)
    .where(like(toilets.name, '[TEST]%'))
    .returning({ id: toilets.id });
  console.log(`Removed ${removed.length} old test toilets`);

  if (!process.argv.includes('--clear')) {
    const rows = sample.map((t) => ({
      ...t,
      status: 'active' as const,
      lastConfirmedAt: new Date(),
    }));
    await db.insert(toilets).values(rows);
    console.log(`Inserted ${rows.length} test toilets`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
