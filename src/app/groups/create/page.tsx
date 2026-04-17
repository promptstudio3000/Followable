import type { Metadata } from "next";
import { GroupCreateView } from "@/components/group-create-view";

export const metadata: Metadata = {
  title: "Create Group",
  description: "Create a public, private, questionnaire-based, password, or paid travel community.",
};

export default function GroupCreatePage() {
  return <GroupCreateView />;
}
