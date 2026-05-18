"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OldWhatsAppPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/platforms/whatsapp");
  }, [router]);

  return null;
}
