import { redirect } from "next/navigation";

// Legacy automation-landing path. The home (`/`) is now the automation-first
// landing; keep this route as a redirect so old links keep working.
export default function WhatsappPage() {
  redirect("/");
}