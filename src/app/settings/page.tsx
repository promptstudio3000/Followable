import type { Metadata } from "next";
import { SettingsView } from "@/components/settings-view";

export const metadata: Metadata = {
  title: "Nastavení",
  description: "Účet, oznámení a preference.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
