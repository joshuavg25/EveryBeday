import { notFound } from 'next/navigation';

// Any address that isn't a real page lands here and shows the translated "not found" screen
export default function CatchAllPage() {
  notFound();
}
