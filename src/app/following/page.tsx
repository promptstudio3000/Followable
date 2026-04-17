import type { Metadata } from "next";
import { FollowingView } from "@/components/following-view";

export const metadata: Metadata = {
  title: "Following",
  description: "A trusted feed of places from followed creators, with desktop split-view browsing.",
};

export default function FollowingPage() {
  return <FollowingView />;
}
