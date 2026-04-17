import type { Metadata } from "next";
import { PublicItineraryView } from "@/components/public-itinerary-view";

export const metadata: Metadata = {
  title: "Shared itinerary",
  description: "A Followable itinerary shared as a public route view.",
};

export default function PublicItineraryPage() {
  return <PublicItineraryView />;
}
