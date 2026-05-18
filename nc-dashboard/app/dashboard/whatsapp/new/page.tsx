"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OldNewWhatsAppPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/platforms/whatsapp/new");
  }, [router]);

  return null;
}
