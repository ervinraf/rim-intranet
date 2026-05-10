"use client"

import React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Clock, FolderOpen,
  Wrench, HardHat, LogOut, GanttChartSquare, Settings,
  Menu, X, Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavItem { label: string; href: string; icon: React.ElementType }
interface NavSection { title: string; items: NavItem[] }

function LogoMark({ companyLogo, companyName, size = "md" }: { companyLogo?: string | null; companyName: string; size?: "sm" | "md" }) {
  const [imgError, setImgError] = React.useState(false)
  if (companyLogo && !imgError) {
    return (
      <img
        src={companyLogo}
        alt={companyName}
        className={size === "sm" ? "h-7 max-w-[60px] object-contain" : "h-9 max-w-[80px] object-contain"}
        onError={() => setImgError(true)}
      />
    )
  }
  return size === "sm" ? (
    <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-xs">
      {companyName.slice(0, 2).toUpperCase()}
    </div>
  ) : (
    <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm">
      {companyName.slice(0, 2).toUpperCase()}
    </div>
  )
}

const ADMIN_ROLES = ["SUPERADMIN", "ADMIN"]

function getMenuByDepartment(dept: string, role: string): NavSection[] {
  const isAdmin = ADMIN_ROLES.includes(role)
  const isGerente = role === "GERENTE"

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
          { label: "Proyectos y Gantt", href: "/dashboard/proyectos", icon: GanttChartSquare },
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
          { label: "Banco de Horas", href: "/dashboard/horas", icon: Clock },
          { label: "DC3 y EPP", href: "/dashboard/dc3", icon: HardHat },
        ],
      },
      {
        title: "Operaciones",
        items: [
          { label: "Proyectos y Gantt", href: "/dashboard/proyectos", icon: GanttChartSquare },
          { label: "Herramientas y Equipos", href: "/dashboard/herramientas", icon: Wrench },
          { label: "Vales", href: "/dashboard/vales", icon: Receipt },
        ],
      },
      {
        title: "Documentos",
        items: [{ label: "Documentos", href: "/dashboard/documentos", icon: FolderOpen }],
      },
      {
        title: "Sistema",
        items: [{ label: "Configuracion", href: "/dashboard/configuracion", icon: Settings }],
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
  const valesSection: NavItem = { label: "Vales", href: "/dashboard/vales", icon: Receipt }

  switch (dept) {
    case "Recursos Humanos":
      return [base, { title: "RH", items: [{ label: "Banco de Horas", href: "/dashboard/horas", icon: Clock }, { label: "DC3 y EPP", href: "/dashboard/dc3", icon: HardHat }] }, docs]
    case "Administracion":
      return [base, { title: "Administracion", items: [{ label: "Banco de Horas", href: "/dashboard/horas", icon: Clock }, valesSection] }, docs]
    case "Ventas":
      return [base, { title: "Ventas", items: [{ label: "Proyectos y Gantt", href: "/dashboard/proyectos", icon: GanttChartSquare }, valesSection] }, docs]
    case "Operaciones":
      return [base, { title: "Operaciones", items: [{ label: "Proyectos y Gantt", href: "/dashboard/proyectos", icon: GanttChartSquare }, { label: "Herramientas y Equipos", href: "/dashboard/herramientas", icon: Wrench }, { label: "DC3 y EPP", href: "/dashboard/dc3", icon: HardHat }, valesSection] }, docs]
    case "Almacen":
      return [base, { title: "Almacen", items: [{ label: "Herramientas y Equipos", href: "/dashboard/herramientas", icon: Wrench }, valesSection] }, docs]
    case "Taller":
      return [base, { title: "Taller", items: [{ label: "Herramientas y Equipos", href: "/dashboard/herramientas", icon: Wrench }, { label: "DC3 y EPP", href: "/dashboard/dc3", icon: HardHat }, valesSection] }, docs]
    default:
      return [base, docs]
  }
}

interface Props {
  userRole: string
  userName: string
  department?: string
  companyName?: string
  companyLogo?: string | null
}

export function MobileNav({ userRole, userName, department, companyName = "RIM Rigging", companyLogo }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const sections = getMenuByDepartment(department ?? "", userRole)

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <>
      {/* Barra superior — solo visible en movil */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
            <LogoMark companyLogo={companyLogo} companyName={companyName} size="sm" />
          <span className="font-semibold text-sm">{companyName}</span>
        </div>
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-100 z-50 flex flex-col md:hidden">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogoMark companyLogo={companyLogo} companyName={companyName} />
                <div>
                  <p className="font-semibold text-sm text-white">{companyName}</p>
                  {department && <p className="text-xs text-slate-400">{department}</p>}
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

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
                          onClick={() => setOpen(false)}
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
        </>
      )}
    </>
  )
}
