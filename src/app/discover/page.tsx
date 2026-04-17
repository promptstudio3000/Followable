import type { Metadata } from "next";
import { HomeDiscovery } from "@/components/home-discovery";

export const metadata: Metadata = {
  title: "Discover",
  description: "Live mapa a feed pro rychlé prohlížení míst v okolí.",
};

export default function DiscoverPage() {
  return <HomeDiscovery />;
}
