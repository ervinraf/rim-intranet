"use client"

import { useState, useMemo, useRef } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Upload, Search, Phone, Mail, Building2, Download } from "lucide-react"
import { ImportModal } from "@/components/employees/import-modal"
import { downloadCsv } from "@/lib/csv"

const typeLabels = {
  OPERATIVO: { label: "Operativo", className: "bg-blue-100 text-blue-700" },
  SUPERVISOR: { label: "Supervisor", className: "bg-violet-100 text-violet-700" },
  ADMINISTRATIVO: { label: "Administrativo", className: "bg-slate-100 text-slate-600" },
}

interface Employee {
  id: string
  fullName: string
  paterno: string
  nombres: string
  employeeType: "OPERATIVO" | "SUPERVISOR" | "ADMINISTRATIVO"
  position?: string | null
  phone?: string | null
  extension?: string | null
  isActive: boolean
  departmentId?: string | null
  department?: { name: string } | null
  role?: { name: string } | null
  user: { email: string; isActive: boolean }
}

interface Department { id: string; name: string }
interface Role { id: string; name: string }

interface Props {
  employees: Employee[]
  departments: Department[]
  roles: Role[]
  isAdmin: boolean
}

export function EmployeeListClient({ employees: initial, departments, roles, isAdmin }: Props) {
  const [employees, setEmployees] = useState(initial)
  const [search, setSearch] = useState("")
  const [filterDept, setFilterDept] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [showImport, setShowImport] = useState(false)

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch =
        !search ||
        e.fullName.toLowerCase().includes(search.toLowerCase()) ||
        e.position?.toLowerCase().includes(search.toLowerCase()) ||
        e.user.email.toLowerCase().includes(search.toLowerCase())
      const matchDept = filterDept === "all" || e.departmentId === filterDept
      const matchType = filterType === "all" || e.employeeType === filterType
      return matchSearch && matchDept && matchType
    })
  }, [employees, search, filterDept, filterType])

  const byDept = useMemo(() => {
    const map: Record<string, Employee[]> = {}
    for (const e of filtered) {
      const key = e.department?.name ?? "Sin departamento"
      if (!map[key]) map[key] = []
      map[key].push(e)
    }
    return map
  }, [filtered])

  function handleImportSuccess() {
    setShowImport(false)
    window.location.reload()
  }

  function exportCsv() {
    const header = ["No.", "Nombre completo", "Email", "Tipo", "Departamento", "Puesto", "Telefono", "Activo"]
    const rows = filtered.map((e) => [
      "",
      e.fullName,
      e.user.email,
      e.employeeType,
      e.department?.name ?? "",
      e.position ?? "",
      e.phone ?? "",
      e.isActive ? "Si" : "No",
    ])
    downloadCsv([header, ...rows], `empleados_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Empleados</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {employees.length} colaboradores · {employees.filter((e) => e.isActive).length} activos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1.5" />
            Exportar
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                <Upload className="w-4 h-4 mr-1.5" />
                Importar CSV
              </Button>
              <Link href="/dashboard/usuarios/nuevo">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nuevo
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, puesto o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDept} onValueChange={(v) => setFilterDept(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="OPERATIVO">Operativos</SelectItem>
            <SelectItem value="SUPERVISOR">Supervisores</SelectItem>
            <SelectItem value="ADMINISTRATIVO">Administrativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employee cards grouped by dept */}
      {Object.keys(byDept).length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No se encontraron empleados</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byDept).sort().map(([dept, list]) => (
            <div key={dept}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700">{dept}</h2>
                <span className="text-xs text-slate-400">{list.length} personas</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {list.map((emp) => {
                  const typeCfg = typeLabels[emp.employeeType]
                  return (
                    <Link
                      key={emp.id}
                      href={`/dashboard/usuarios/${emp.id}`}
                      className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {emp.paterno.slice(0, 1)}{emp.nombres.slice(0, 1)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!emp.isActive && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${typeCfg.className}`}>
                            {typeCfg.label}
                          </span>
                        </div>
                      </div>
                      <p className="font-medium text-slate-900 text-sm leading-tight">{emp.fullName}</p>
                      {emp.position && (
                        <p className="text-xs text-slate-500 mt-0.5">{emp.position}</p>
                      )}
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {emp.user.email}
                        </p>
                        {emp.phone && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            {emp.phone}
                            {emp.extension && <span>ext. {emp.extension}</span>}
                          </p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal
          departments={departments}
          roles={roles}
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  )
}
