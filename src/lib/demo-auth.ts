import { seedData } from "@/lib/demo-data";

export const DEMO_PASSWORD = "followable123";

export function validateDemoCredentials(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const user = seedData.users.find((entry) => entry.username === normalizedUsername);

  if (!user || password !== DEMO_PASSWORD) {
    return null;
  }

  return user;
}
