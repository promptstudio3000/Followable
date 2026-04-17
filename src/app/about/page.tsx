import type { Metadata } from "next";
import { AboutView } from "@/components/about-view";

export const metadata: Metadata = {
  title: "O projektu",
  description: "Co je Followable, demo režim a jak aplikaci používat.",
};

export default function AboutPage() {
  return <AboutView />;
}
