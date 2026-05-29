"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Download, Upload, X, Check, AlertCircle, FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"

interface ParsedRow {
  employee: string
  date: string
  checkIn: string
  checkOut: string
  type: string
  notes: string
  valid: boolean
  error?: string
}

interface Props {
  employees?: { fullName: string; itemNumber?: number | null }[]
  onImported: (result: { created: number; updated: number; errors: string[] }) => void
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  NORMAL: "Normal", TARDANZA: "Tardanza", FALTA: "Falta",
  VACACIONES: "Vacaciones", PERMISO: "Permiso", INCAPACIDAD: "Incapacidad",
}

function parseDate(val: any): string | null {
  if (!val) return null
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`
  }
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/")
    return `${y}-${m}-${d}`
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/")
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  const native = new Date(str)
  if (!isNaN(native.getTime())) return native.toISOString().slice(0, 10)
  return null
}

function parseTime(val: any): string {
  if (!val && val !== 0) return ""
  // Excel stores times as fractions of a day
  if (typeof val === "number" && val < 1) {
    const totalMinutes = Math.round(val * 24 * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }
  const str = String(val).trim()
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) return str.slice(0, 5)
  return str
}

export function downloadAttendanceTemplate(employees?: { fullName: string; itemNumber?: number | null }[]) {
  const rows: (string | number | null)[][] = [["Empleado", "Fecha", "Entrada", "Salida", "Tipo", "Notas"]]
  if (employees?.length) {
    for (const emp of employees) {
      rows.push([emp.fullName, "", "", "", "NORMAL", ""])
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)

  const notes: Record<string, string> = {
    A1: "Nombre completo del empleado (como aparece en el sistema).\nTambien acepta numero de empleado (Num/Item).\nEj: Carlos Gonzalez Lopez",
    B1: "Fecha de asistencia.\nFormato: YYYY-MM-DD o DD/MM/YYYY\nEj: 2026-05-18",
    C1: "Hora de entrada en formato HH:MM (24 horas).\nEj: 08:00\nDejar en blanco si no aplica.",
    D1: "Hora de salida en formato HH:MM (24 horas).\nEj: 17:30\nDejar en blanco si no aplica.",
    E1: "Tipo de asistencia. Valores validos:\nNORMAL, TARDANZA, FALTA, VACACIONES, PERMISO, INCAPACIDAD\nDefault si se omite: NORMAL",
    F1: "Observaciones o comentarios (opcional).\nEj: Permiso medico, Llegada por trafico...",
  }
  Object.entries(notes).forEach(([cell, text]) => {
    if (!ws[cell].c) ws[cell].c = []
    ws[cell].c.push({ a: "Intranet", t: text })
  })

  ws["!cols"] = [{ wch: 30 }, { wch: 13 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 30 }]

  const inst = XLSX.utils.aoa_to_sheet([
    ["PLANTILLA DE ASISTENCIA EN LOTES - INTRANET RIM RIGGING"],
    [""],
    ["Llena la hoja 'Asistencia' con los registros a importar."],
    ["Si ya existe un registro para ese empleado y fecha, se actualizara."],
    [""],
    ["COLUMNA", "DESCRIPCION", "REQUERIDA", "EJEMPLO"],
    ["Empleado", "Nombre completo (como aparece en el sistema) o numero de empleado", "SI", "Carlos Gonzalez Lopez"],
    ["Fecha", "Fecha del registro. Formato: YYYY-MM-DD o DD/MM/YYYY", "SI", "2026-05-18"],
    ["Entrada", "Hora de entrada HH:MM en 24 horas", "NO", "08:00"],
    ["Salida", "Hora de salida HH:MM en 24 horas", "NO", "17:30"],
    ["Tipo", "NORMAL / TARDANZA / FALTA / VACACIONES / PERMISO / INCAPACIDAD", "NO", "NORMAL"],
    ["Notas", "Observaciones opcionales", "NO", "Permiso medico"],
    [""],
    ["TIPOS DE ASISTENCIA:"],
    ["NORMAL", "Asistencia completa y a tiempo"],
    ["TARDANZA", "Llego tarde"],
    ["FALTA", "No se presento"],
    ["VACACIONES", "Dia de vacaciones autorizado"],
    ["PERMISO", "Permiso autorizado"],
    ["INCAPACIDAD", "Baja medica o incapacidad"],
    [""],
    ["NOTAS:"],
    ["", "Si un empleado ya tiene registro en esa fecha, se sobreescribe con los datos del archivo."],
    ["", "El nombre del empleado debe coincidir con el nombre en el sistema (puede ser parcial)."],
  ])
  inst["!cols"] = [{ wch: 16 }, { wch: 65 }, { wch: 12 }, { wch: 28 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia")
  XLSX.utils.book_append_sheet(wb, inst, "Instrucciones")
  XLSX.writeFile(wb, "plantilla_asistencia.xlsx")
}

export function ImportAttendanceModal({ employees, onImported, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array", cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })

        let headerIdx = 0
        for (let i = 0; i < Math.min(raw.length, 10); i++) {
          const row = raw[i].map((c: any) => String(c).toLowerCase())
          if (row.some((c) => c.includes("empleado") || c.includes("nombre"))) {
            headerIdx = i
            break
          }
        }

        const header = raw[headerIdx].map((c: any) => String(c).toLowerCase())
        const col = (kw: string[]) => header.findIndex((h) => kw.some((k) => h.includes(k)))

        const empIdx = col(["empleado", "nombre", "num"])
        const dateIdx = col(["fecha", "date"])
        const inIdx = col(["entrada", "checkin", "check_in", "inicio", "ingreso"])
        const outIdx = col(["salida", "checkout", "check_out", "fin", "egreso"])
        const typeIdx = col(["tipo", "type"])
        const notesIdx = col(["nota", "observ", "comment"])

        if (empIdx === -1 || dateIdx === -1) {
          setError("No se encontraron columnas 'Empleado' y 'Fecha'. Revisa el archivo.")
          return
        }

        const parsed: ParsedRow[] = []
        for (let i = headerIdx + 1; i < raw.length; i++) {
          const row = raw[i]
          const employee = String(row[empIdx] ?? "").trim()
          if (!employee) continue

          const date = parseDate(dateIdx >= 0 ? row[dateIdx] : null)
          if (!date) {
            parsed.push({ employee, date: "", checkIn: "", checkOut: "", type: "", notes: "", valid: false, error: "Fecha invalida" })
            continue
          }

          parsed.push({
            employee,
            date,
            checkIn: parseTime(inIdx >= 0 ? row[inIdx] : null),
            checkOut: parseTime(outIdx >= 0 ? row[outIdx] : null),
            type: typeIdx >= 0 ? String(row[typeIdx] ?? "").trim().toUpperCase() || "NORMAL" : "NORMAL",
            notes: notesIdx >= 0 ? String(row[notesIdx] ?? "").trim() : "",
            valid: true,
          })
        }

        if (parsed.length === 0) {
          setError("No se encontraron registros en el archivo.")
          return
        }
        setRows(parsed)
      } catch {
        setError("Error al leer el archivo. Asegurate de que sea un .xlsx valido.")
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ""
  }

  async function handleImport() {
    const valid = rows.filter((r) => r.valid)
    if (!valid.length) return
    setLoading(true)
    try {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: valid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al importar")
      setResult(data)
      // onImported is called when the user clicks Cerrar (see button below)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const validCount = rows.filter((r) => r.valid).length
  const invalidCount = rows.filter((r) => !r.valid).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Importar asistencia desde Excel</h2>
            <p className="text-xs text-slate-500 mt-0.5">Carga registros de asistencia en lote</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {!result ? (
            <>
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Paso 1 — Descarga la plantilla</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Columnas: Empleado · Fecha · Entrada · Salida · Tipo · Notas
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => downloadAttendanceTemplate(employees)}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Plantilla
                </Button>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Paso 2 — Sube tu archivo</p>
                <p className="text-xs text-slate-500 mb-2">
                  Si ya existe registro para ese empleado y fecha, se actualiza automaticamente.
                </p>
                <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFile} />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Seleccionar archivo Excel
                </Button>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {rows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">
                      Vista previa — {validCount} registros
                      {invalidCount > 0 && <span className="text-red-500 ml-1">({invalidCount} con error)</span>}
                    </p>
                    <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setRows([])}>
                      Limpiar
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Empleado</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Fecha</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Entrada</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Salida</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((r, i) => (
                          <tr key={i} className={r.valid ? "" : "bg-red-50"}>
                            <td className="px-3 py-1.5 text-slate-700 max-w-[160px] truncate">{r.employee}</td>
                            <td className="px-3 py-1.5 text-slate-500">
                              {r.date || <span className="text-red-500">{r.error}</span>}
                            </td>
                            <td className="px-3 py-1.5 text-slate-500">{r.checkIn || "—"}</td>
                            <td className="px-3 py-1.5 text-slate-500">{r.checkOut || "—"}</td>
                            <td className="px-3 py-1.5 text-slate-500">{TYPE_LABELS[r.type] ?? (r.type || "Normal")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-medium text-slate-800">Importacion completada</p>
              <p className="text-sm text-slate-500">
                {result.created} nuevos · {result.updated} actualizados
              </p>
              {result.errors.length > 0 && (
                <div className="mt-3 text-left bg-red-50 border border-red-100 rounded-lg px-4 py-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-red-700 mb-1">{result.errors.length} errores:</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-2 justify-end">
          <Button variant="outline" onClick={result ? () => onImported(result) : onClose}>
            {result ? "Cerrar y recargar" : "Cancelar"}
          </Button>
          {!result && validCount > 0 && (
            <Button onClick={handleImport} disabled={loading}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {loading ? "Importando..." : `Importar ${validCount} registros`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
