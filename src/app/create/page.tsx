import type { Metadata } from "next";
import { CreatePostWizard } from "@/components/create-post-wizard";

export const metadata: Metadata = {
  title: "Nový příspěvek",
  description: "Vytvořit příspěvek s místem, viditelností a médii.",
};

export default function CreatePage() {
  return <CreatePostWizard />;
}
