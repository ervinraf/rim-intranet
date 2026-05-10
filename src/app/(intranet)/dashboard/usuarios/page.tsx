import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EmployeeListClient } from "./employee-list-client"

export default async function UsuariosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")

  const [employees, departments, roles] = await Promise.all([
    prisma.employee.findMany({
      include: {
        department: { select: { name: true } },
        role: { select: { name: true } },
        user: { select: { email: true, isActive: true } },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <EmployeeListClient
      employees={JSON.parse(JSON.stringify(employees))}
      departments={departments}
      roles={roles}
      isAdmin={isAdmin}
    />
  )
}
