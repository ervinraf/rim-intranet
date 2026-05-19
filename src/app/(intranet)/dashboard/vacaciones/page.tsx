import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { VacacionesClient } from "./vacaciones-client"

export default async function VacacionesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const [requests, employees] = await Promise.all([
    prisma.vacationRequest.findMany({
      where: isAdmin ? {} : { employeeId: session.user.employeeId ?? "__none__" },
      include: {
        employee: { select: { fullName: true, department: { select: { name: true } } } },
        approvedBy: { select: { fullName: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 500,
    }),
    isAdmin
      ? prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true, fullName: true, department: { select: { name: true } } },
          orderBy: { fullName: "asc" },
        })
      : [],
  ])

  return (
    <VacacionesClient
      requests={JSON.parse(JSON.stringify(requests))}
      employees={employees}
      isAdmin={isAdmin}
      hasEmployee={!!session.user.employeeId}
    />
  )
}
