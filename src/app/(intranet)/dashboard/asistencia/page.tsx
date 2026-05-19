import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AsistenciaClient } from "./asistencia-client"

export default async function AsistenciaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)

  const [records, employees, departments] = await Promise.all([
    prisma.attendance.findMany({
      where: isAdmin
        ? { date: { gte: from, lte: to } }
        : { employeeId: session.user.employeeId ?? "__none__", date: { gte: from, lte: to } },
      include: {
        employee: { select: { fullName: true, position: true, department: { select: { name: true } } } },
      },
      orderBy: [{ date: "desc" }, { employee: { fullName: "asc" } }],
    }),
    isAdmin
      ? prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true, fullName: true, departmentId: true, department: { select: { name: true } } },
          orderBy: { fullName: "asc" },
        })
      : [],
    isAdmin
      ? prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
      : [],
  ])

  return (
    <AsistenciaClient
      records={JSON.parse(JSON.stringify(records))}
      employees={employees}
      departments={departments}
      isAdmin={isAdmin}
      currentEmployeeId={session.user.employeeId ?? null}
      currentMonth={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`}
    />
  )
}
