import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"

export default async function IntranetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  let departmentName: string | undefined
  if (session.user.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      select: { department: { select: { name: true } } },
    })
    departmentName = emp?.department?.name ?? undefined
  }

  const sysConfigs = await prisma.systemConfig.findMany({
    where: { key: { in: ["company_name", "company_logo"] } },
  })
  const cfg = Object.fromEntries(sysConfigs.map((c) => [c.key, c.value]))
  const companyName = cfg.company_name ?? "RIM Rigging"
  const companyLogo = cfg.company_logo ?? null

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — oculto en movil */}
      <div className="hidden md:block">
        <Sidebar
          userRole={session.user.role ?? "EMPLEADO"}
          userName={session.user.name ?? session.user.email ?? "Usuario"}
          department={departmentName}
          companyName={companyName}
          companyLogo={companyLogo}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <MobileNav
          userRole={session.user.role ?? "EMPLEADO"}
          userName={session.user.name ?? session.user.email ?? "Usuario"}
          department={departmentName}
          companyName={companyName}
          companyLogo={companyLogo}
        />

        <main className="flex-1 bg-slate-50 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
