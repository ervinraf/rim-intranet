import Link from "next/link"
import { GanttChartSquare } from "lucide-react"

interface Project {
  id: string
  name: string
  clientName: string
  progress: number
  status: string
  tasks: { progress: number }[]
}

export function ProjectsWidget({ projects }: { projects: Project[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <GanttChartSquare className="w-4 h-4 text-slate-500" />
          <p className="text-sm font-semibold text-slate-800">Proyectos en desarrollo</p>
        </div>
        <Link href="/dashboard/proyectos" className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2">
          Ver todos
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/proyectos/${p.id}`}
            className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
              <p className="text-xs text-slate-400 truncate">{p.clientName}</p>
            </div>
            <div className="ml-4 text-right flex-shrink-0">
              <p className="text-sm font-bold text-slate-900">{p.progress}%</p>
              <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
