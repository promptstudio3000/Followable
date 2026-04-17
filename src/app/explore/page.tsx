import type { Metadata } from "next";
import { ExploreView } from "@/components/explore-view";

export const metadata: Metadata = {
  title: "Explore",
  description: "Mapa, statistiky regionu, témata, tvůrci a kolekce podle země a kraje.",
};

export default function ExplorePage() {
  return <ExploreView />;
}
