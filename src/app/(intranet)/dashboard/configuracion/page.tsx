import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ConfigClient } from "./config-client"

export default async function ConfiguracionPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) redirect("/dashboard")

  const EMPRESA_KEYS = ["company_history", "company_vision", "company_mission", "company_services"]

  const [configs, departments, roles] = await Promise.all([
    prisma.systemConfig.findMany(),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { employees: true } } },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { employees: true } } },
    }),
  ])
  const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]))

  const empresaMap = Object.fromEntries(
    configs.filter((c) => EMPRESA_KEYS.includes(c.key)).map((c) => [c.key, c.value])
  )

  return (
    <ConfigClient
      config={configMap}
      departments={JSON.parse(JSON.stringify(departments))}
      roles={JSON.parse(JSON.stringify(roles))}
      empresa={empresaMap}
    />
  )
}
