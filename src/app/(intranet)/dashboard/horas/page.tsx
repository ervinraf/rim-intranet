import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { HorasClient } from "./horas-client"

export default async function HorasPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  const isOperativo = session.user.employeeType === "OPERATIVO"

  if (!isAdmin && !isOperativo) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-slate-900">Banco de horas extras</h1>
        <p className="text-slate-500 mt-2">
          Este modulo aplica solo al personal operativo.
        </p>
      </div>
    )
  }

  let salarioBase = 0
  let sdi = 0
  let employeeWorkdayHours = 8

  if (isOperativo && session.user.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      select: { salarioBase: true, sdi: true, workdayHours: true },
    })
    salarioBase = Number(emp?.salarioBase ?? 0)
    sdi = Number(emp?.sdi ?? 0)
    employeeWorkdayHours = emp?.workdayHours ?? 8
  }

  const employees = isAdmin
    ? await prisma.employee.findMany({
        where: { isActive: true, employeeType: "OPERATIVO" },
        select: { id: true, fullName: true, workdayHours: true, department: { select: { name: true } } },
        orderBy: { fullName: "asc" },
      })
    : []

  return (
    <HorasClient
      isAdmin={isAdmin}
      isOperativo={isOperativo}
      salarioBase={salarioBase}
      sdi={sdi}
      employeeId={session.user.employeeId ?? ""}
      employeeWorkdayHours={employeeWorkdayHours}
      employees={employees}
    />
  )
}
