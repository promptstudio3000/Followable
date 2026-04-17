import type { Metadata } from "next";
import { ItineraryView } from "@/components/itinerary-view";

export const metadata: Metadata = {
  title: "Itinerary",
  description: "Day-by-day trip planning on top of saved locations and discovered places.",
};

export default function ItineraryPage() {
  return <ItineraryView />;
}
