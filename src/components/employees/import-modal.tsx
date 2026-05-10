"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react"

interface Department { id: string; name: string }
interface Role { id: string; name: string }

interface ImportModalProps {
  departments: Department[]
  roles: Role[]
  onClose: () => void
  onSuccess: () => void
}

interface ImportResult {
  message: string
  created: number
  skipped: number
  errors: string[]
}

export function ImportModal({ departments, roles, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [defaultDeptId, setDefaultDeptId] = useState("")
  const [defaultRoleId, setDefaultRoleId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImport() {
    if (!file) return
    setLoading(true)

    const fd = new FormData()
    fd.append("file", file)
    if (defaultDeptId) fd.append("departmentId", defaultDeptId)
    if (defaultRoleId) fd.append("roleId", defaultRoleId)

    const res = await fetch("/api/employees/import", { method: "POST", body: fd })
    const data = await res.json()
    setResult(data)
    setLoading(false)

    if (data.created > 0) {
      setTimeout(onSuccess, 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Importar empleados desde CSV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Format hint */}
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
            <p className="font-medium text-slate-700">Formato del CSV:</p>
            <p>El sistema reconoce el formato del Excel de horas extras:</p>
            <code className="block bg-slate-100 rounded px-2 py-1 text-xs mt-1 overflow-x-auto whitespace-nowrap">
              ITEM,PATERNO,MATERNO,NOMBRES,NOMBRES2,SDI,SB,MENSUAL,...
            </code>
            <p className="mt-1">Tambien acepta columnas opcionales: EMAIL, TIPO, DEPARTAMENTO, PUESTO</p>
            <p className="text-slate-400 mt-1">Contrasena inicial para todos: RimRigging2026!</p>
          </div>

          {/* File picker */}
          <div>
            <Label>Archivo CSV</Label>
            <div
              className="mt-1.5 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-slate-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                  <FileText className="w-4 h-4 text-slate-500" />
                  {file.name}
                  <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div className="text-slate-400 text-sm">
                  <Upload className="w-5 h-5 mx-auto mb-1" />
                  Selecciona el archivo CSV
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {/* Defaults */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Departamento por defecto</Label>
              <Select value={defaultDeptId} onValueChange={(v) => setDefaultDeptId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rol por defecto</Label>
              <Select value={defaultRoleId} onValueChange={(v) => setDefaultRoleId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-3 text-sm ${result.errors.length ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
              <div className="flex items-center gap-2 font-medium mb-1">
                {result.errors.length ? (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                {result.message}
              </div>
              {result.errors.length > 0 && (
                <ul className="text-xs text-amber-700 space-y-0.5 mt-1">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>...y {result.errors.length - 5} errores mas</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || loading}
            className="flex-1"
          >
            {loading ? "Importando..." : "Importar"}
          </Button>
        </div>
      </div>
    </div>
  )
}
