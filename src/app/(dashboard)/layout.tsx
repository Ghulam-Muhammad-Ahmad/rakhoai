import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { prisma } from "@/lib/db/prisma";
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

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const dbUser = await prisma.user.upsert({
    where: { supabaseId: user.id },
    create: {
      supabaseId: user.id,
      email: user.email!,
      name: fullName,
    },
    update: { name: fullName },
    include: { academy: true },
  });

  if (!dbUser.academy) {
    redirect("/onboarding");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
