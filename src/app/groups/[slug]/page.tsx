import type { Metadata } from "next";
import { GroupDetailView } from "@/components/group-detail-view";

export const metadata: Metadata = {
  title: "Group",
  description: "Shared community map, latest posts, and paid/private travel group access.",
};

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GroupDetailView slug={slug} />;
}
