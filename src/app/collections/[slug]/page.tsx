import { CollectionView } from "@/components/collection-view";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CollectionView slug={slug} />;
}
