import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { EmployeeProfileClient } from "./employee-profile-client"

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")

  // Solo admin o el propio empleado
  if (!isAdmin && session.user.employeeId !== id) redirect("/dashboard")

  const [employee, departments, roles] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        role: true,
        user: { select: { email: true, isActive: true, createdAt: true } },
        overtimeRecords: {
          orderBy: { weekStart: "desc" },
          take: 8,
          select: { id: true, weekStart: true, weekEnd: true, hoursWorked: true, netHours: true, status: true },
        },
        hoursBank: {
          where: { isExpired: false },
          select: { hoursAvailable: true, expiresAt: true, isExpired: true },
        },
      },
    }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ])

  if (!employee) notFound()

  const totalBankHours = employee.hoursBank.reduce(
    (sum, e) => sum + Number(e.hoursAvailable),
    0
  )

  return (
    <EmployeeProfileClient
      employee={JSON.parse(JSON.stringify(employee))}
      departments={departments}
      roles={roles}
      isAdmin={isAdmin}
      totalBankHours={totalBankHours}
    />
  )
}
