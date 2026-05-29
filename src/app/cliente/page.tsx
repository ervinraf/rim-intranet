export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { GanttChart } from "@/components/gantt/gantt-chart"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MapPin, Calendar, Camera } from "lucide-react"

const statusConfig = {
  NUEVO: { label: "Iniciando", color: "text-blue-600", dot: "bg-blue-500" },
  EN_DESARROLLO: { label: "En ejecucion", color: "text-amber-600", dot: "bg-amber-500" },
  CERRADO: { label: "Completado", color: "text-green-600", dot: "bg-green-500" },
}

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) notFound()

  const [project, configs] = await Promise.all([
    prisma.project.findFirst({
      where: { accessToken: token, isActive: true },
      include: {
        tasks: {
          orderBy: { order: "asc" },
          include: { photos: { orderBy: { takenAt: "desc" } } },
        },
        photos: { orderBy: { takenAt: "desc" } },
        updates: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    }),
    prisma.systemConfig.findMany({ where: { key: { in: ["company_name", "company_logo"] } } }),
  ])

  if (!project) notFound()

  const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]))
  const companyName = configMap.company_name ?? "RIM Rigging"
  const companyLogo = configMap.company_logo ?? null
  const cfg = statusConfig[project.status]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="h-9 w-auto object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm">
                {companyName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{companyName}</p>
              <p className="text-xs text-slate-400">Portal de seguimiento</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
            <span className={cfg.color}>{cfg.label}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Project info */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{project.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            {project.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {project.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Inicio: {format(new Date(project.startDate), "d 'de' MMMM yyyy", { locale: es })}
              {project.endDate && (
                <> · Entrega estimada: {format(new Date(project.endDate), "d 'de' MMMM yyyy", { locale: es })}</>
              )}
            </span>
          </div>
        </div>

        {/* Progress hero */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-slate-800 text-lg">Avance del proyecto</p>
            <p className="text-3xl font-bold text-amber-600">{project.progress}%</p>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>Inicio</span>
            <span>Completado</span>
          </div>
        </div>

        {/* Gantt — read only */}
        {project.tasks.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-3">Actividades del proyecto</h2>
            <GanttChart
              tasks={project.tasks.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description ?? undefined,
                startDate: t.startDate.toISOString(),
                endDate: t.endDate.toISOString(),
                actualStartDate: t.actualStartDate?.toISOString() ?? null,
                actualEndDate: t.actualEndDate?.toISOString() ?? null,
                progress: t.progress,
                color: t.color,
              }))}
              projectStart={project.startDate.toISOString()}
              projectEnd={project.endDate?.toISOString()}
              readOnly
            />
          </div>
        )}

        {/* Photos by task */}
        {project.tasks.some((t) => t.photos.length > 0) && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              <span className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-500" />
                Registro fotografico
              </span>
            </h2>
            <div className="space-y-6">
              {project.tasks
                .filter((t) => t.photos.length > 0)
                .map((task) => (
                  <div key={task.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-slate-700">{task.name}</p>
                      <span className="text-xs text-slate-400">{task.progress}% completado</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {task.photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="aspect-square rounded-xl overflow-hidden bg-slate-100 shadow-sm"
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption ?? "avance de obra"}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Bitacora de avances */}
        {project.updates.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-3">Ultimas actualizaciones</h2>
            <div className="space-y-3">
              {project.updates.map((u) => (
                <div key={u.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                  <p className="text-sm text-slate-700">{u.note}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(u.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center pt-4 pb-2 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Portal privado de seguimiento · RIM Rigging ·{" "}
            <a href="https://rim-rigging.com" className="hover:text-slate-600 transition-colors">
              rim-rigging.com
            </a>
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Built with Claude Web Builder by{" "}
            <a href="https://tododeia.com" className="hover:text-slate-400 transition-colors">
              Tododeia
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}
