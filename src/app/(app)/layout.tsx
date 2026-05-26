import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({
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

  // Fetch user profile from app_user table
  const { data: profile } = await supabase
    .from("app_user")
    .select("name, role, department_id")
    .eq("id", user.id)
    .maybeSingle();

  const userName = profile?.name || user.email?.split("@")[0] || "User";
  const userRole = profile?.role || "employee";

  // Fetch department name if user has a department
  let userDepartment: string | null = null;
  if (profile?.department_id) {
    const { data: dept } = await supabase
      .from("department")
      .select("name")
      .eq("id", profile.department_id)
      .maybeSingle();
    userDepartment = dept?.name ?? null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={{
          id: user.id,
          email: user.email,
          name: userName,
          role: userRole,
          department: userDepartment,
        }}
      />
      <main className="flex-1 overflow-x-hidden bg-slate-50">
        {/* Top padding for mobile to account for fixed menu button */}
        <div className="lg:hidden h-12" />
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
