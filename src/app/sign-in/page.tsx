import type { Metadata } from "next";
import { SignInView } from "@/components/sign-in-view";

export const metadata: Metadata = {
  title: "Přihlášení",
  description: "Přihlášení demo účtem nebo pokračováním jako host.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const username = typeof params.username === "string" ? params.username : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;

  return <SignInView error={error} username={username} next={next} />;
}
