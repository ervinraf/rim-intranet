"use client"

import Link from "next/link"
import { differenceInDays, format } from "date-fns"
import { es } from "date-fns/locale"
import {
  FolderOpen, CheckCircle2, Wrench, ShoppingCart,
  Users, UserCheck, UserX, Clock, AlertTriangle, TrendingUp,
} from "lucide-react"

interface Project {
  id: string
  name: string
  clientName: string
  progress: number
  startDate: string
  endDate: string | null
  status: string
  tasks: { progress: number; endDate: string; actualEndDate: string | null }[]
}

interface Equipment {
  id: string
  name: string
  nextServiceDate: string | null
  status: string
}

interface AttendanceRecord {
  type: string
  employee: { fullName: string; department: { name: string } | null }
}

interface OverdueTask {
  id: string
  name: string
  endDate: string
  progress: number
  project: { id: string; name: string }
}

interface Props {
  activeProjects: Project[]
  closedThisMonth: number
  equipmentOutOfService: number
  equipmentNearService: Equipment[]
  todayAttendance: AttendanceRecord[]
  totalEmployees: number
  pendingRequisitions: number
  overdueTasks: OverdueTask[]
}

function semaphore(project: Project): "green" | "yellow" | "red" {
  const now = new Date()
  if (!project.endDate) return "green"
  const end = new Date(project.endDate)
  const daysLeft = differenceInDays(end, now)
  if (daysLeft < 0 && project.progress < 100) return "red"
  if (daysLeft <= 14 && project.progress < 70) return "yellow"
  return "green"
}

const semaphoreStyles = {
  green:  { dot: "bg-emerald-500", label: "En tiempo",  badge: "bg-emerald-50 text-emerald-700" },
  yellow: { dot: "bg-amber-400",   label: "Por vencer", badge: "bg-amber-50 text-amber-700" },
  red:    { dot: "bg-red-500",     label: "Atrasado",   badge: "bg-red-50 text-red-600" },
}

function KpiCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function EjecutivoClient({
  activeProjects,
  closedThisMonth,
  equipmentOutOfService,
  equipmentNearService,
  todayAttendance,
  totalEmployees,
  pendingRequisitions,
  overdueTasks,
}: Props) {
  const avgProgress = activeProjects.length
    ? Math.round(activeProjects.reduce((s, p) => s + p.progress, 0) / activeProjects.length)
    : 0

  const present = todayAttendance.filter((a) => a.type === "NORMAL" || a.type === "TARDANZA").length
  const tardanza = todayAttendance.filter((a) => a.type === "TARDANZA").length
  const falta = todayAttendance.filter((a) => a.type === "FALTA").length
  const sinRegistro = Math.max(0, totalEmployees - todayAttendance.length)

  const today = new Date()

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard Ejecutivo</h1>
        <p className="text-sm text-slate-500 mt-1 capitalize">
          {format(today, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={FolderOpen}
          label="Proyectos activos"
          value={activeProjects.length}
          sub={`${closedThisMonth} cerrados este mes`}
          color="bg-blue-50 text-blue-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="Avance promedio"
          value={`${avgProgress}%`}
          sub="de todos los proyectos activos"
          color="bg-amber-50 text-amber-600"
        />
        <KpiCard
          icon={Wrench}
          label="Equipos fuera de servicio"
          value={equipmentOutOfService}
          sub={`${equipmentNearService.length} con servicio proximo`}
          color={equipmentOutOfService > 0 ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Requisiciones pendientes"
          value={pendingRequisitions}
          sub="sin aprobar"
          color={pendingRequisitions > 0 ? "bg-orange-50 text-orange-600" : "bg-slate-50 text-slate-500"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Projects table */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Proyectos en curso</h2>
          {activeProjects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-slate-400 text-sm">Sin proyectos activos</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Proyecto</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 hidden sm:table-cell">Cliente</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Avance</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 hidden md:table-cell">Fecha fin</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeProjects.map((project) => {
                    const sem = semaphore(project)
                    const st = semaphoreStyles[sem]
                    const daysLeft = project.endDate
                      ? differenceInDays(new Date(project.endDate), today)
                      : null
                    return (
                      <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/proyectos/${project.id}`}
                            className="text-sm font-medium text-slate-800 hover:text-amber-600 transition-colors"
                          >
                            {project.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-sm text-slate-500">{project.clientName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700 tabular-nums w-8">
                              {project.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {project.endDate ? (
                            <span className={`text-xs ${daysLeft !== null && daysLeft < 0 ? "text-red-600 font-medium" : "text-slate-500"}`}>
                              {format(new Date(project.endDate), "d MMM yyyy", { locale: es })}
                              {daysLeft !== null && daysLeft >= 0 && (
                                <span className="text-slate-400"> ({daysLeft}d)</span>
                              )}
                              {daysLeft !== null && daysLeft < 0 && (
                                <span> (+{Math.abs(daysLeft)}d)</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Sin fecha</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${st.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Asistencia hoy */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">Asistencia hoy</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <UserCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-emerald-700">{present}</p>
                <p className="text-xs text-emerald-600">Presentes</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <UserX className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-red-600">{falta}</p>
                <p className="text-xs text-red-500">Faltas</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-amber-700">{tardanza}</p>
                <p className="text-xs text-amber-600">Tardanzas</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <Users className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-600">{sinRegistro}</p>
                <p className="text-xs text-slate-500">Sin registro</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center mt-3">{totalEmployees} empleados activos en total</p>
          </div>

          {/* Alertas */}
          {(overdueTasks.length > 0 || equipmentNearService.length > 0) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-800">Alertas</h3>
              </div>
              <div className="space-y-2">
                {overdueTasks.map((task) => {
                  const daysLate = differenceInDays(today, new Date(task.endDate))
                  return (
                    <Link
                      key={task.id}
                      href={`/dashboard/proyectos/${task.project.id}`}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-red-700 truncate">{task.name}</p>
                        <p className="text-xs text-red-500">{task.project.name} · +{daysLate}d atrasada</p>
                      </div>
                    </Link>
                  )
                })}
                {equipmentNearService.map((eq) => {
                  const isOverdue = eq.nextServiceDate && new Date(eq.nextServiceDate) < today
                  return (
                    <Link
                      key={eq.id}
                      href="/dashboard/herramientas"
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-colors ${
                        isOverdue
                          ? "bg-red-50 hover:bg-red-100"
                          : "bg-amber-50 hover:bg-amber-100"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isOverdue ? "bg-red-500" : "bg-amber-400"}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${isOverdue ? "text-red-700" : "text-amber-700"}`}>
                          {eq.name}
                        </p>
                        <p className={`text-xs ${isOverdue ? "text-red-500" : "text-amber-600"}`}>
                          Servicio: {eq.nextServiceDate
                            ? format(new Date(eq.nextServiceDate), "d MMM", { locale: es })
                            : "—"}
                          {isOverdue ? " (vencido)" : ""}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Todo OK */}
          {overdueTasks.length === 0 && equipmentNearService.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-700">Sin alertas activas</p>
              <p className="text-xs text-emerald-600 mt-1">Todo en orden</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
