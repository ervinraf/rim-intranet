import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ChecklistsClient } from "./checklists-client"

export default async function ChecklistsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const [lists, projects, equipment] = await Promise.all([
    prisma.checkList.findMany({
      where: { isActive: true },
      include: {
        items: { orderBy: { order: "asc" } },
        project: { select: { name: true } },
        equipment: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.project.findMany({
      where: { status: { in: ["NUEVO", "EN_DESARROLLO"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.equipment.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <ChecklistsClient
      lists={JSON.parse(JSON.stringify(lists))}
      projects={projects}
      equipment={equipment}
      isAdmin={isAdmin}
    />
  )
}
