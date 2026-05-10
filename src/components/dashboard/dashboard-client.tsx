"use client"

import { useState } from "react"
import { AnnouncementFeed } from "./announcement-feed"
import { AnnouncementForm } from "./announcement-form"
import { StatCard } from "./stat-card"
import { AlertWidget } from "./alert-widget"
import { ProjectsWidget } from "./projects-widget"
import {
  Users, Clock, FileText, Wrench, Package,
  GraduationCap, AlertTriangle, HardHat, ShoppingCart, Calendar,
} from "lucide-react"

interface Props {
  userName: string
  userRole: string
  userDept: { id: string; name: string } | null
  employeeType: string | null
  isAdmin: boolean
  announcements: any[]
  departments: any[]
  globalStats: {
    totalEmployees: number
    pendingOvertimes: number
    pendingTimeOffs: number
    pendingRequisitions: number
    pendingRepairs: number
  }
  myBankBalance: number
  dc3Expiring: any[]
  equipmentInRepair: any[]
  equipmentNearService: any[]
  damagedTools: any[]
  overdueCheckouts: any[]
  pendingRequisitionsList: any[]
  activeProjects: any[]
  birthdayEmployees: any[]
}

export function DashboardClient({
  userName, userRole, userDept, employeeType, isAdmin,
  announcements: initialAnnouncements, departments, globalStats,
  myBankBalance, dc3Expiring, equipmentInRepair, equipmentNearService,
  damagedTools, overdueCheckouts, pendingRequisitionsList, activeProjects,
  birthdayEmployees,
}: Props) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [showForm, setShowForm] = useState(false)

  const deptName = userDept?.name ?? ""
  const greeting = new Date().getHours() < 12 ? "Buenos dias" : new Date().getHours() < 19 ? "Buenas tardes" : "Buenas noches"

  function handleNewAnnouncement(a: any) {
    setAnnouncements([a, ...announcements])
    setShowForm(false)
  }

  function handleDeleteAnnouncement(id: string) {
    setAnnouncements(announcements.filter((a) => a.id !== id))
  }

  return (
    <div className="p-8">
      {/* Saludo */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          {greeting}, {userName.split(" ")[0]}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          {deptName || userRole} ·{" "}
          {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="xl:col-span-2 space-y-6">

          {/* Stats globales — Admin */}
          {isAdmin && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard label="Empleados" value={globalStats.totalEmployees} icon={Users} href="/dashboard/usuarios" />
              <StatCard label="Horas pendientes" value={globalStats.pendingOvertimes} icon={Clock} href="/dashboard/horas" alert={globalStats.pendingOvertimes > 0} />
              <StatCard label="Tiempo libre" value={globalStats.pendingTimeOffs} icon={FileText} href="/dashboard/horas" alert={globalStats.pendingTimeOffs > 0} />
              <StatCard label="Requisiciones" value={globalStats.pendingRequisitions} icon={ShoppingCart} href="/dashboard/herramientas" alert={globalStats.pendingRequisitions > 0} />
              <StatCard label="Reparaciones" value={globalStats.pendingRepairs} icon={Wrench} href="/dashboard/herramientas" alert={globalStats.pendingRepairs > 0} />
            </div>
          )}

          {/* Mi banco de horas — operativos */}
          {employeeType === "OPERATIVO" && (
            <StatCard
              label="Mi banco de horas"
              value={`${myBankBalance.toFixed(1)} hrs`}
              icon={Clock}
              href="/dashboard/horas"
              large
              description="Disponibles para usar como tiempo libre"
            />
          )}

          {/* ── Widgets por departamento ── */}

          {/* Proyectos activos (Ventas, Operaciones, Admin) */}
          {activeProjects.length > 0 && (
            <ProjectsWidget projects={activeProjects} />
          )}

          {/* DC3 por vencer */}
          {dc3Expiring.length > 0 && (
            <AlertWidget
              title="DC3 proximos a vencer"
              icon={GraduationCap}
              iconColor="text-amber-600"
              bgColor="bg-amber-50 border-amber-200"
              href="/dashboard/dc3"
              items={dc3Expiring.map((r) => ({
                id: r.id,
                label: r.employee.fullName,
                sublabel: r.courseName,
                badge: r.expiresAt
                  ? `Vence ${new Date(r.expiresAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`
                  : "",
                badgeColor: "bg-amber-100 text-amber-700",
              }))}
            />
          )}

          {/* Equipos en reparacion */}
          {equipmentInRepair.length > 0 && (
            <AlertWidget
              title="Equipos en reparacion"
              icon={Wrench}
              iconColor="text-red-500"
              bgColor="bg-red-50 border-red-200"
              href="/dashboard/herramientas"
              items={equipmentInRepair.map((e) => ({
                id: e.id,
                label: e.name,
                sublabel: e.repairRequests?.[0]?.description ?? "Sin descripcion",
                badge: e.code ?? "",
                badgeColor: "bg-red-100 text-red-600",
              }))}
            />
          )}

          {/* Equipos proximos a servicio preventivo */}
          {equipmentNearService.length > 0 && (
            <AlertWidget
              title="Servicio preventivo proximo"
              icon={Package}
              iconColor="text-blue-500"
              bgColor="bg-blue-50 border-blue-200"
              href="/dashboard/herramientas"
              items={equipmentNearService.map((e) => ({
                id: e.id,
                label: e.name,
                sublabel: e.brand ? `${e.brand} ${e.model ?? ""}` : "Sin marca",
                badge: e.nextServiceDate
                  ? new Date(e.nextServiceDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
                  : "",
                badgeColor: "bg-blue-100 text-blue-700",
              }))}
            />
          )}

          {/* Herramientas danadas */}
          {damagedTools.length > 0 && (
            <AlertWidget
              title="Herramientas danadas o en baja"
              icon={AlertTriangle}
              iconColor="text-red-500"
              bgColor="bg-red-50 border-red-200"
              href="/dashboard/herramientas"
              items={damagedTools.map((t) => ({
                id: t.id,
                label: t.name,
                sublabel: t.location ?? "Sin ubicacion",
                badge: t.condition,
                badgeColor: t.condition === "BAJA" ? "bg-slate-100 text-slate-500" : "bg-red-100 text-red-600",
              }))}
            />
          )}

          {/* Herramientas no devueltas */}
          {overdueCheckouts.length > 0 && (
            <AlertWidget
              title="Herramientas no devueltas (vencidas)"
              icon={HardHat}
              iconColor="text-orange-500"
              bgColor="bg-orange-50 border-orange-200"
              href="/dashboard/herramientas"
              items={overdueCheckouts.map((c) => ({
                id: c.id,
                label: `${c.tool.name} → ${c.employee.fullName}`,
                sublabel: c.expectedReturn
                  ? `Esperada: ${new Date(c.expectedReturn).toLocaleDateString("es-MX")}`
                  : "",
                badge: "Vencido",
                badgeColor: "bg-orange-100 text-orange-700",
              }))}
            />
          )}

          {/* Requisiciones pendientes */}
          {pendingRequisitionsList.length > 0 && (
            <AlertWidget
              title="Requisiciones pendientes de surtir"
              icon={ShoppingCart}
              iconColor="text-violet-500"
              bgColor="bg-violet-50 border-violet-200"
              href="/dashboard/herramientas"
              items={pendingRequisitionsList.map((r) => ({
                id: r.id,
                label: r.title,
                sublabel: r.department?.name ?? "Sin departamento",
                badge: r.priority === "URGENTE" ? "Urgente" : "Normal",
                badgeColor: r.priority === "URGENTE"
                  ? "bg-red-100 text-red-600"
                  : "bg-slate-100 text-slate-500",
              }))}
            />
          )}

          {/* Cumpleanos del mes */}
          {birthdayEmployees.length > 0 && (
            <AlertWidget
              title="Cumpleanos este mes"
              icon={Calendar}
              iconColor="text-pink-500"
              bgColor="bg-pink-50 border-pink-200"
              href="/dashboard/usuarios"
              items={birthdayEmployees.map((e) => ({
                id: e.fullName,
                label: e.fullName,
                sublabel: e.position ?? "",
                badge: e.birthDate
                  ? new Date(e.birthDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
                  : "",
                badgeColor: "bg-pink-100 text-pink-700",
              }))}
            />
          )}
        </div>

        {/* Columna lateral — Tablero de avisos */}
        <div className="space-y-4">
          {isAdmin && (
            <>
              {showForm ? (
                <AnnouncementForm
                  departments={departments}
                  onSuccess={handleNewAnnouncement}
                  onCancel={() => setShowForm(false)}
                />
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors"
                >
                  + Publicar aviso
                </button>
              )}
            </>
          )}
          <AnnouncementFeed
            announcements={announcements}
            isAdmin={isAdmin}
            onDelete={handleDeleteAnnouncement}
          />
        </div>
      </div>
    </div>
  )
}
