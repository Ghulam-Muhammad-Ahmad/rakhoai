import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { SettingsClient } from "@/components/dashboard/SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await getAuthUserWithAcademy(user.id, supabase);
  if (!dbUser.academy) redirect("/onboarding");

  return (
    <SettingsClient
      academy={{
        name: dbUser.academy.name,
        country: dbUser.academy.country,
        currency: dbUser.academy.currency,
      }}
      ownerEmail={user.email ?? "Unknown"}
    />
  );
}
