import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EmployeeForm } from "@/components/employees/employee-form"

export default async function NuevoUsuarioPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) redirect("/dashboard")

  const [departments, roles] = await Promise.all([
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Nuevo empleado</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Se creara un usuario y perfil de empleado. La contrasena temporal se puede cambiar despues.
        </p>
      </div>
      <EmployeeForm departments={departments} roles={roles} mode="create" />
    </div>
  )
}
