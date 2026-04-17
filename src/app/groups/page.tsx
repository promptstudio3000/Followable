import type { Metadata } from "next";
import { GroupsView } from "@/components/groups-view";

export const metadata: Metadata = {
  title: "Groups",
  description: "Public, private, and paid travel communities built around shared locations.",
};

export default function GroupsPage() {
  return <GroupsView />;
}
