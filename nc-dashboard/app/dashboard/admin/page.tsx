import { redirect } from "next/navigation";

/**
 * /dashboard/admin index — the admin section currently lives under
 * /dashboard/admin/users; a bare /dashboard/admin visit previously 404'd.
 */
export default function AdminIndexPage() {
  redirect("/dashboard/admin/users");
}