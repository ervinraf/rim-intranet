"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Clock, FolderOpen,
  Wrench, HardHat, LogOut, GanttChartSquare, Settings, Receipt,
  CalendarDays, ClipboardList, UserCheck, Palmtree, Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const ADMIN_ROLES = ["SUPERADMIN", "ADMIN"]

// Menus por departamento
function getMenuByDepartment(dept: string, role: string): NavSection[] {
  const isAdmin = ADMIN_ROLES.includes(role)
  const isGerente = role === "GERENTE"

  // Gerente ve todos los modulos operativos
  if (isGerente) {
    return [
      {
        title: "General",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Usuarios", href: "/dashboard/usuarios", icon: Users },
        ],
      },
      {
        title: "Operaciones",
        items: [
          { label: "Proyectos", href: "/dashboard/proyectos", icon: GanttChartSquare },
          { label: "Gantt global", href: "/dashboard/gantt", icon: GanttChartSquare },
          { label: "Herramientas y Equipos", href: "/dashboard/herramientas", icon: Wrench },
          { label: "Vales", href: "/dashboard/vales", icon: Receipt },
        ],
      },
      {
        title: "Recursos Humanos",
        items: [
          { label: "Banco de Horas", href: "/dashboard/horas", icon: Clock },
          { label: "DC3 y EPP", href: "/dashboard/dc3", icon: HardHat },
        ],
      },
      {
        title: "Documentos",
        items: [{ label: "Documentos", href: "/dashboard/documentos", icon: FolderOpen }],
      },
    ]
  }

  // Admin y Superadmin ven todo
  if (isAdmin) {
    return [
      {
        title: "General",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Usuarios", href: "/dashboard/usuarios", icon: Users },
        ],
      },
      {
        title: "Recursos Humanos",
        items: [
          { label: "Asistencia", href: "/dashboard/asistencia", icon: UserCheck },
          { label: "Vacaciones", href: "/dashboard/vacaciones", icon: Palmtree },
          { label: "Banco de Horas", href: "/dashboard/horas", icon: Clock },
          { label: "DC3 y EPP", href: "/dashboard/dc3", icon: HardHat },
        ],
      },
      {
        title: "Operaciones",
        items: [
          { label: "Proyectos", href: "/dashboard/proyectos", icon: GanttChartSquare },
          { label: "Gantt global", href: "/dashboard/gantt", icon: GanttChartSquare },
          { label: "Calendario", href: "/dashboard/calendario", icon: CalendarDays },
          { label: "Check Lists", href: "/dashboard/checklists", icon: ClipboardList },
          { label: "Herramientas y Equipos", href: "/dashboard/herramientas", icon: Wrench },
          { label: "Vales", href: "/dashboard/vales", icon: Receipt },
        ],
      },
      {
        title: "Documentos",
        items: [
          { label: "Documentos", href: "/dashboard/documentos", icon: FolderOpen },
        ],
      },
      {
        title: "Ventas",
        items: [
          { label: "Encuestas clientes", href: "/dashboard/encuestas", icon: Star },
        ],
      },
      {
        title: "Sistema",
        items: [
          { label: "Configuracion", href: "/dashboard/configuracion", icon: Settings },
        ],
      },
    ]
  }

  const base: NavSection = {
    title: "General",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  }

  const docs: NavSection = {
    title: "Documentos",
    items: [{ label: "Documentos", href: "/dashboard/documentos", icon: FolderOpen }],
  }

  switch (dept) {
    case "Recursos Humanos":
      return [
        base,
        {
          title: "RH",
          items: [
            { label: "Asistencia", href: "/dashboard/asistencia", icon: UserCheck },
            { label: "Vacaciones", href: "/dashboard/vacaciones", icon: Palmtree },
            { label: "Banco de Horas", href: "/dashboard/horas", icon: Clock },
            { label: "DC3 y EPP", href: "/dashboard/dc3", icon: HardHat },
          ],
        },
        docs,
      ]

    case "Administracion":
      return [
        base,
        {
          title: "Administracion",
          items: [
            { label: "Asistencia", href: "/dashboard/asistencia", icon: UserCheck },
            { label: "Vacaciones", href: "/dashboard/vacaciones", icon: Palmtree },
            { label: "Banco de Horas", href: "/dashboard/horas", icon: Clock },
            { label: "Vales", href: "/dashboard/vales", icon: Receipt },
          ],
        },
        docs,
      ]

    case "Ventas":
      return [
        base,
        {
          title: "Ventas",
          items: [
            { label: "Proyectos y Gantt", href: "/dashboard/proyectos", icon: GanttChartSquare },
            { label: "Vales", href: "/dashboard/vales", icon: Receipt },
          ],
        },
        docs,
      ]

    case "Operaciones":
      return [
        base,
        {
          title: "Operaciones",
          items: [
            { label: "Proyectos y Gantt", href: "/dashboard/proyectos", icon: GanttChartSquare },
            { label: "Calendario", href: "/dashboard/calendario", icon: CalendarDays },
            { label: "Check Lists", href: "/dashboard/checklists", icon: ClipboardList },
            { label: "Herramientas y Equipos", href: "/dashboard/herramientas", icon: Wrench },
            { label: "DC3 y EPP", href: "/dashboard/dc3", icon: HardHat },
            { label: "Vales", href: "/dashboard/vales", icon: Receipt },
          ],
        },
        docs,
      ]

    case "Almacen":
      return [
        base,
        {
          title: "Almacen",
          items: [
            { label: "Herramientas y Equipos", href: "/dashboard/herramientas", icon: Wrench },
            { label: "Vales", href: "/dashboard/vales", icon: Receipt },
          ],
        },
        docs,
      ]

    case "Taller":
      return [
        base,
        {
          title: "Taller",
          items: [
            { label: "Herramientas y Equipos", href: "/dashboard/herramientas", icon: Wrench },
            { label: "DC3 y EPP", href: "/dashboard/dc3", icon: HardHat },
            { label: "Vales", href: "/dashboard/vales", icon: Receipt },
          ],
        },
        docs,
      ]

    default:
      // Sin departamento asignado — menu basico
      return [base, docs]
  }
}

function LogoMark({ companyLogo, companyName }: { companyLogo?: string | null; companyName: string }) {
  const [imgError, setImgError] = React.useState(false)
  if (companyLogo && !imgError) {
    return (
      <img
        src={companyLogo}
        alt={companyName}
        className="h-9 max-w-[80px] object-contain flex-shrink-0"
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm flex-shrink-0">
      {companyName.slice(0, 2).toUpperCase()}
    </div>
  )
}

interface SidebarProps {
  userRole: string
  userName: string
  department?: string
  companyName?: string
  companyLogo?: string | null
}

export function Sidebar({ userRole, userName, department, companyName = "RIM Rigging", companyLogo }: SidebarProps) {
  const pathname = usePathname()
  const sections = getMenuByDepartment(department ?? "", userRole)

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <LogoMark companyLogo={companyLogo} companyName={companyName} />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white truncate">{companyName}</p>
            {department && (
              <p className="text-xs text-slate-400 truncate">{department}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive(item.href)
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300 flex-shrink-0">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{userName}</p>
            <p className="text-xs text-slate-500 truncate">{userRole}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800 px-3"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesion
        </Button>
      </div>
    </aside>
  )
}
