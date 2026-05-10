import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, MapPin, Camera, Calendar } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const statusConfig = {
  NUEVO: { label: "Nuevo", className: "bg-blue-100 text-blue-700" },
  EN_DESARROLLO: { label: "En desarrollo", className: "bg-amber-100 text-amber-700" },
  CERRADO: { label: "Cerrado", className: "bg-green-100 text-green-700" },
}

export default async function ProyectosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const projects = await prisma.project.findMany({
    where: { isActive: true },
    include: {
      tasks: { orderBy: { order: "asc" } },
      _count: { select: { photos: true, updates: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const byStatus = {
    NUEVO: projects.filter((p) => p.status === "NUEVO"),
    EN_DESARROLLO: projects.filter((p) => p.status === "EN_DESARROLLO"),
    CERRADO: projects.filter((p) => p.status === "CERRADO"),
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Proyectos</h1>
          <p className="text-slate-500 mt-1 text-sm">{projects.length} proyectos totales</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/proyectos/nuevo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo proyecto
            </Button>
          </Link>
        )}
      </div>

      {/* Kanban por estatus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(["NUEVO", "EN_DESARROLLO", "CERRADO"] as const).map((status) => {
          const cfg = statusConfig[status]
          const list = byStatus[status]
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
                  {cfg.label}
                </span>
                <span className="text-xs text-slate-400">{list.length}</span>
              </div>
              <div className="space-y-3">
                {list.length === 0 && (
                  <p className="text-xs text-slate-400 px-1">Sin proyectos</p>
                )}
                {list.map((project) => (
                  <Link key={project.id} href={`/dashboard/proyectos/${project.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200">
                      <CardContent className="p-4">
                        <p className="font-medium text-slate-900 text-sm mb-1">{project.name}</p>
                        <p className="text-xs text-slate-500 mb-3">{project.clientName}</p>

                        {project.location && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                            <MapPin className="w-3 h-3" />
                            {project.location}
                          </div>
                        )}

                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Avance</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              {project._count.photos}
                            </span>
                            <span>{project.tasks.length} actividades</span>
                          </div>
                          {project.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(project.startDate), "d MMM", { locale: es })}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
