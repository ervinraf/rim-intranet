import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { ProjectDetailClient } from "./project-detail-client"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id, isActive: true },
    include: {
      tasks: {
        orderBy: { order: "asc" },
        include: { photos: { orderBy: { takenAt: "desc" } } },
      },
      photos: { orderBy: { takenAt: "desc" } },
      updates: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  })

  if (!project) notFound()

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  return (
    <ProjectDetailClient
      project={JSON.parse(JSON.stringify(project))}
      isAdmin={isAdmin}
    />
  )
}
