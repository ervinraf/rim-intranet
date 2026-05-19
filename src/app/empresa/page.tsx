import { prisma } from "@/lib/prisma"

const KEYS = ["company_name", "company_logo", "company_history", "company_vision", "company_mission", "company_services"]

const statusLabel: Record<string, string> = {
  NUEVO: "Nuevo",
  EN_DESARROLLO: "En desarrollo",
  CERRADO: "Cerrado",
}

const statusColor: Record<string, string> = {
  NUEVO: "bg-blue-100 text-blue-700",
  EN_DESARROLLO: "bg-amber-100 text-amber-700",
  CERRADO: "bg-slate-100 text-slate-500",
}

export default async function EmpresaPage() {
  const [configs, projects] = await Promise.all([
    prisma.systemConfig.findMany({ where: { key: { in: KEYS } } }),
    prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, name: true, clientName: true, location: true, status: true, startDate: true, endDate: true },
      orderBy: { startDate: "desc" },
    }),
  ])

  const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]))
  const name = cfg.company_name ?? "RIM Rigging"
  const logo = cfg.company_logo ?? null

  const clients = Array.from(new Set(projects.map((p) => p.clientName))).filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={name} className="h-9 max-w-[80px] object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm">
              {name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm">{name}</p>
            <p className="text-xs text-slate-400">Quienes somos</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {cfg.company_history && (
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Historia</h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{cfg.company_history}</p>
            </div>
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {cfg.company_vision && (
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">Vision</h2>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 h-full">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{cfg.company_vision}</p>
              </div>
            </section>
          )}
          {cfg.company_mission && (
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">Mision</h2>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 h-full">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{cfg.company_mission}</p>
              </div>
            </section>
          )}
        </div>

        {cfg.company_services && (
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Servicios</h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{cfg.company_services}</p>
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Proyectos</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {projects.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900 text-sm leading-snug">{p.name}</p>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[p.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{p.clientName}</p>
                  {p.location && (
                    <p className="text-xs text-slate-400">{p.location}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {clients.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Clientes</h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex flex-wrap gap-2">
                {clients.map((client) => (
                  <span key={client} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                    {client}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {!cfg.company_history && !cfg.company_vision && !cfg.company_mission && projects.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">Informacion de la empresa</p>
            <p className="text-sm mt-1">El administrador puede agregar la historia, vision y mision desde Configuracion.</p>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 mt-10 py-4 text-center text-xs text-slate-400">
        {name}
      </footer>
    </div>
  )
}
