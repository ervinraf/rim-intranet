"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Download, Upload, X, Check, AlertCircle, FileSpreadsheet, ChevronRight } from "lucide-react"
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

interface SheetInfo {
  name: string
  rows: ParsedRow[]
  existing: number
  notFound: number
  total: number
  checked: boolean
}

type Step = "upload" | "select" | "preview" | "done"

interface Props {
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

function parseSheet(ws: XLSX.WorkSheet): ParsedRow[] {
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

  if (empIdx === -1 || dateIdx === -1) return []

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
  return parsed
}

export function downloadAttendanceTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Empleado", "Fecha", "Entrada", "Salida", "Tipo", "Notas"],
  ])

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
  ])
  inst["!cols"] = [{ wch: 16 }, { wch: 65 }, { wch: 12 }, { wch: 28 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia")
  XLSX.utils.book_append_sheet(wb, inst, "Instrucciones")
  XLSX.writeFile(wb, "plantilla_asistencia.xlsx")
}

function SheetStatusBadge({ sheet }: { sheet: SheetInfo }) {
  const validRows = sheet.rows.filter((r) => r.valid)
  if (validRows.length === 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Sin datos</span>
  }
  if (sheet.existing === 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Nuevo</span>
  }
  if (sheet.existing >= validRows.length) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Ya importado</span>
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Parcial</span>
}

export function ImportAttendanceModal({ onImported, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("upload")
  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [checking, setChecking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array", cellDates: false })

        // Skip sheets that look like instructions
        const dataSheets = wb.SheetNames.filter((name) =>
          !["instrucciones", "instruccion", "instructions", "info", "ayuda"].includes(name.toLowerCase())
        )

        if (dataSheets.length === 0) {
          setError("No se encontraron hojas de datos en el archivo.")
          return
        }

        const parsed: SheetInfo[] = dataSheets.map((name) => ({
          name,
          rows: parseSheet(wb.Sheets[name]),
          existing: 0,
          notFound: 0,
          total: 0,
          checked: false,
        }))

        const withData = parsed.filter((s) => s.rows.some((r) => r.valid))
        if (withData.length === 0) {
          setError("No se encontraron registros validos en el archivo. Revisa las columnas 'Empleado' y 'Fecha'.")
          return
        }

        setChecking(true)
        setSheets(withData)

        // Check each sheet against DB
        const checked = await Promise.all(
          withData.map(async (sheet) => {
            const validRows = sheet.rows.filter((r) => r.valid)
            const res = await fetch("/api/attendance/check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ records: validRows.map((r) => ({ employee: r.employee, date: r.date })) }),
            })
            const data = await res.json()
            const isNew = data.existing === 0
            const isPartial = data.existing > 0 && data.existing < validRows.length
            return {
              ...sheet,
              existing: data.existing ?? 0,
              notFound: data.notFound ?? 0,
              total: validRows.length,
              checked: isNew || isPartial,
            }
          })
        )

        setSheets(checked)
        setChecking(false)
        setStep("select")
      } catch {
        setError("Error al leer el archivo. Asegurate de que sea un .xlsx valido.")
        setChecking(false)
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ""
  }

  function toggleSheet(name: string) {
    setSheets((prev) => prev.map((s) => s.name === name ? { ...s, checked: !s.checked } : s))
  }

  const selectedSheets = sheets.filter((s) => s.checked)
  const allSelectedRows = selectedSheets.flatMap((s) => s.rows.filter((r) => r.valid))

  async function handleImport() {
    if (!allSelectedRows.length) return
    setLoading(true)
    try {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: allSelectedRows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al importar")
      setResult(data)
      setStep("done")
      onImported(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Importar asistencia desde Excel</h2>
            {step === "select" && (
              <p className="text-xs text-slate-500 mt-0.5">
                Selecciona los lotes que quieres importar
              </p>
            )}
            {step === "upload" && (
              <p className="text-xs text-slate-500 mt-0.5">Carga registros de asistencia en lote</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">

          {/* STEP: upload */}
          {step === "upload" && (
            <>
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Paso 1 — Descarga la plantilla</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Columnas: Empleado · Fecha · Entrada · Salida · Tipo · Notas
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadAttendanceTemplate}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Plantilla
                </Button>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Paso 2 — Sube tu archivo</p>
                <p className="text-xs text-slate-500 mb-2">
                  Si el archivo tiene varias hojas (lotes), podras elegir cuales importar.
                </p>
                <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFile} />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={checking}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {checking ? "Analizando lotes..." : "Seleccionar archivo Excel"}
                </Button>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}

          {/* STEP: select sheets */}
          {step === "select" && (
            <>
              <div className="space-y-2">
                {sheets.map((sheet) => {
                  const hasData = sheet.rows.some((r) => r.valid)
                  const isAllImported = hasData && sheet.existing >= sheet.total
                  return (
                    <label
                      key={sheet.name}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                        sheet.checked
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 hover:border-slate-300"
                      } ${!hasData || isAllImported ? "opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={sheet.checked}
                        disabled={!hasData}
                        onChange={() => toggleSheet(sheet.name)}
                        className="rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{sheet.name}</p>
                        {hasData ? (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {sheet.total} registros
                            {sheet.existing > 0 && (
                              <span className="ml-1 text-amber-600">
                                · {sheet.existing} ya en el sistema
                              </span>
                            )}
                            {sheet.notFound > 0 && (
                              <span className="ml-1 text-red-500">
                                · {sheet.notFound} empleado(s) no encontrado(s)
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">Sin registros validos</p>
                        )}
                      </div>
                      <SheetStatusBadge sheet={sheet} />
                    </label>
                  )
                })}
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {selectedSheets.length > 0 && (
                <div className="bg-slate-50 rounded-lg px-4 py-2 text-sm text-slate-600">
                  {selectedSheets.length} lote(s) seleccionado(s) · {allSelectedRows.length} registros totales
                </div>
              )}
            </>
          )}

          {/* STEP: done */}
          {step === "done" && result && (
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-2 justify-between items-center">
          <div>
            {step === "select" && (
              <button
                className="text-sm text-slate-400 hover:text-slate-600"
                onClick={() => { setStep("upload"); setSheets([]); setError(null) }}
              >
                Subir otro archivo
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {step === "done" ? "Cerrar" : "Cancelar"}
            </Button>
            {step === "select" && (
              <Button onClick={handleImport} disabled={loading || selectedSheets.length === 0}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {loading
                  ? "Importando..."
                  : `Importar ${allSelectedRows.length} registro${allSelectedRows.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
