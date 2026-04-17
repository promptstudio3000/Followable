"use server";

import { redirect } from "next/navigation";
import { createSession, clearSession } from "@/lib/session";
import { validateDemoCredentials } from "@/lib/demo-auth";

export async function signInAction(formData: FormData) {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  const user = validateDemoCredentials(username, password);

  if (!user) {
    redirect(`/sign-in?error=invalid&username=${encodeURIComponent(username)}`);
  }

  await createSession(user.id);
  redirect(next);
}

export async function signOutAction() {
  await clearSession();
  redirect("/");
}
