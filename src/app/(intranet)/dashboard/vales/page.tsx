import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ValesClient } from "./vales-client"

export default async function ValesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const [vales, employees, projects] = await Promise.all([
    prisma.vale.findMany({
      where: isAdmin ? {} : { employeeId: session.user.employeeId ?? "__none__" },
      include: {
        employee: { select: { fullName: true, department: { select: { name: true } } } },
        project: { select: { name: true } },
        approvedBy: { select: { fullName: true } },
      },
      orderBy: [{ status: "asc" }, { date: "desc" }],
      take: 300,
    }),
    isAdmin
      ? prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        })
      : [],
    prisma.project.findMany({
      where: { status: { in: ["NUEVO", "EN_DESARROLLO"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <ValesClient
      vales={JSON.parse(JSON.stringify(vales))}
      employees={employees}
      projects={projects}
      currentEmployeeId={session.user.employeeId ?? null}
      isAdmin={isAdmin}
    />
  )
}
