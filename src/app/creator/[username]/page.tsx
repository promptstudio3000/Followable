import { CreatorProfileView } from "@/components/creator-profile-view";

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <CreatorProfileView username={username} />;
}
