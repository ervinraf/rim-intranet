import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AsistenciaClient } from "./asistencia-client"

export default async function AsistenciaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isSuperAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  const isGerente = session.user.role === "GERENTE"
  const isAdmin = isSuperAdmin || isGerente

  // Gerente solo ve su departamento
  let userDeptId: string | null = null
  if (isGerente && session.user.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      select: { departmentId: true },
    })
    userDeptId = emp?.departmentId ?? null
  }

  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)

  const attendanceWhere = isSuperAdmin
    ? { date: { gte: from, lte: to } }
    : isGerente && userDeptId
    ? { date: { gte: from, lte: to }, employee: { departmentId: userDeptId } }
    : { employeeId: session.user.employeeId ?? "__none__", date: { gte: from, lte: to } }

  const employeeWhere = isSuperAdmin
    ? { isActive: true }
    : isGerente && userDeptId
    ? { isActive: true, departmentId: userDeptId }
    : null

  const [records, employees, departments] = await Promise.all([
    prisma.attendance.findMany({
      where: attendanceWhere,
      include: {
        employee: { select: { fullName: true, position: true, department: { select: { name: true } } } },
      },
      orderBy: [{ date: "desc" }, { employee: { fullName: "asc" } }],
    }),
    employeeWhere
      ? prisma.employee.findMany({
          where: employeeWhere,
          select: { id: true, fullName: true, departmentId: true, department: { select: { name: true } } },
          orderBy: { fullName: "asc" },
        })
      : [],
    isSuperAdmin
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
