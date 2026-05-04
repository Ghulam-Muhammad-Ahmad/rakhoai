import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { getAuthUserWithAcademy } from "@/lib/db/auth-user";
import { createClient } from "@/lib/supabase/server";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

export default async function OnboardingLayout({
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
  if (dbUser.academy) {
    redirect("/dashboard");
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";
  const email = user.email ?? "";
  const initials = getInitials(fullName);

  async function signOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app, #FAFAF7)" }}>
      {/* Slim top bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--neutral-200, #E5E7EB)",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* User + sign out */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            {/* Avatar + name */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--accent-100, #FEF3C7)",
                  color: "var(--accent-700, #B45309)",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--neutral-800, #1F2937)" }}>
                  {fullName}
                </div>
                <div style={{ fontSize: 11, color: "var(--neutral-500, #6B7280)" }}>
                  {email}
                </div>
              </div>
            </div>

            {/* Sign out button */}
            <form action={signOut}>
              <button
                type="submit"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 34,
                  padding: "0 12px",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1px solid var(--neutral-200, #E5E7EB)",
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--neutral-600, #4B5563)",
                  cursor: "pointer",
                }}
              >
                <LogOut size={13} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main
        style={{
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        {children}
      </main>
    </div>
  );
}
