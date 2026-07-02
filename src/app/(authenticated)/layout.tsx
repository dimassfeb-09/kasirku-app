import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserNav } from "@/components/layout/user-nav";
import { StoreSelector } from "@/components/layout/store-selector";
import { StoreProvider } from "@/lib/store-context";
import { db } from "@/lib/prisma";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { email: true, fullName: true, role: true },
  });

  return (
    <StoreProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background lg:flex-row">
        <AppSidebar userRole={user?.role || session.role} />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 lg:px-6">
            <StoreSelector />
            <UserNav
              user={{
                email: user?.email || session.email,
                fullName: user?.fullName || session.email,
                role: user?.role || session.role,
              }}
            />
          </header>
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </StoreProvider>
  );
}
