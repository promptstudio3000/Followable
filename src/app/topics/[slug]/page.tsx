import { TopicView } from "@/components/topic-view";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TopicView slug={slug} />;
}
