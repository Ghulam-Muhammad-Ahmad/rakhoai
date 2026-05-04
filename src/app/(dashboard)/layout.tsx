import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await getAuthUserWithAcademy(user.id);

  if (!dbUser.academy) {
    redirect("/onboarding");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
