"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Download, Upload, X, Check, AlertCircle, FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"

type InventoryType = "tools" | "equipment"

interface ParsedRow {
  nombre: string
  codigo?: string
  marca?: string
  modelo?: string
  noSerie?: string
  departamento?: string
  ubicacion?: string
  fechaCompra?: string
  precioCompra?: string
  proxServicio?: string
  notas?: string
  valid: boolean
  error?: string
}

interface Props {
  type: InventoryType
  onImported: (result: { created: number; skipped: number; errors: string[] }) => void
  onClose: () => void
}

const HEADERS_TOOLS = ["Codigo", "Nombre", "Marca", "Modelo", "No.Serie", "Departamento", "Ubicacion", "Notas"]
const HEADERS_EQUIP = ["Codigo", "Nombre", "Marca", "Modelo", "No.Serie", "Departamento", "Ubicacion", "FechaCompra", "PrecioCompra", "ProxServicio", "Notas"]

function downloadTemplate(type: InventoryType) {
  const headers = type === "tools" ? HEADERS_TOOLS : HEADERS_EQUIP
  const example = type === "tools"
    ? ["HERR-001", "Tecle de cadena 3 ton", "Greenfield", "R-300", "SN-001", "Operaciones", "Bodega Norte", ""]
    : ["EQ-001", "Grua torre 50 ton", "Liebherr", "LTM-1050", "LH2024001", "Operaciones", "Patio Taller", "15/01/2023", "350000", "30/06/2026", ""]
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws["!cols"] = headers.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, type === "tools" ? "Herramientas" : "Equipos")
  XLSX.writeFile(wb, type === "tools" ? "plantilla_herramientas.xlsx" : "plantilla_equipos.xlsx")
}

function col(header: string[], keywords: string[]): number {
  return header.findIndex((h) => keywords.some((k) => h.toLowerCase().includes(k)))
}

export function ImportInventoryModal({ type, onImported, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })

        let headerIdx = 0
        for (let i = 0; i < Math.min(raw.length, 5); i++) {
          const row = raw[i].map((c: any) => String(c).toLowerCase())
          if (row.some((c) => c.includes("nombre") || c.includes("name"))) {
            headerIdx = i
            break
          }
        }

        const header = raw[headerIdx].map((c: any) => String(c).toLowerCase())
        const nombreIdx = col(header, ["nombre", "name"])
        const codigoIdx = col(header, ["codigo", "code", "clave"])
        const marcaIdx = col(header, ["marca", "brand"])
        const modeloIdx = col(header, ["modelo", "model"])
        const serieIdx = col(header, ["serie", "serial", "no.serie", "noserie"])
        const deptIdx = col(header, ["departamento", "depto", "dept"])
        const ubicIdx = col(header, ["ubicacion", "ubicaci", "location"])
        const notasIdx = col(header, ["nota", "observ", "comment"])
        const compraFechaIdx = col(header, ["fechacompra", "fecha.compra", "compra"])
        const compraPrecioIdx = col(header, ["preciocompra", "precio.compra", "precio", "costo"])
        const servicioIdx = col(header, ["proxservicio", "prox.servicio", "servicio", "mantenimiento"])

        if (nombreIdx === -1) {
          setError("No se encontro la columna 'Nombre'. Revisa el archivo.")
          return
        }

        const parsed: ParsedRow[] = []
        for (let i = headerIdx + 1; i < raw.length; i++) {
          const row = raw[i]
          const nombre = String(row[nombreIdx] ?? "").trim()
          if (!nombre) continue

          parsed.push({
            nombre,
            codigo: codigoIdx >= 0 ? String(row[codigoIdx] ?? "").trim() || undefined : undefined,
            marca: marcaIdx >= 0 ? String(row[marcaIdx] ?? "").trim() || undefined : undefined,
            modelo: modeloIdx >= 0 ? String(row[modeloIdx] ?? "").trim() || undefined : undefined,
            noSerie: serieIdx >= 0 ? String(row[serieIdx] ?? "").trim() || undefined : undefined,
            departamento: deptIdx >= 0 ? String(row[deptIdx] ?? "").trim() || undefined : undefined,
            ubicacion: ubicIdx >= 0 ? String(row[ubicIdx] ?? "").trim() || undefined : undefined,
            notas: notasIdx >= 0 ? String(row[notasIdx] ?? "").trim() || undefined : undefined,
            fechaCompra: compraFechaIdx >= 0 ? String(row[compraFechaIdx] ?? "").trim() || undefined : undefined,
            precioCompra: compraPrecioIdx >= 0 ? String(row[compraPrecioIdx] ?? "").trim() || undefined : undefined,
            proxServicio: servicioIdx >= 0 ? String(row[servicioIdx] ?? "").trim() || undefined : undefined,
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
      const endpoint = type === "tools" ? "/api/tools/bulk" : "/api/equipment/bulk"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: valid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al importar")
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const typeLabel = type === "tools" ? "herramientas" : "equipos"
  const validCount = rows.filter((r) => r.valid).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 capitalize">Importar {typeLabel} desde Excel</h2>
            <p className="text-xs text-slate-500 mt-0.5">Carga el inventario completo desde un archivo</p>
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
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">
                    Columnas: {type === "tools" ? HEADERS_TOOLS.join(" · ") : HEADERS_EQUIP.join(" · ")}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => downloadTemplate(type)}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Plantilla
                </Button>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Paso 2 — Sube tu archivo</p>
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
                    <p className="text-sm font-medium text-slate-700">{validCount} registros listos para importar</p>
                    <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setRows([])}>Limpiar</button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Nombre</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Codigo</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Marca</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Departamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 text-slate-700 max-w-[200px] truncate">{r.nombre}</td>
                            <td className="px-3 py-1.5 text-slate-500 font-mono">{r.codigo || "—"}</td>
                            <td className="px-3 py-1.5 text-slate-500">{r.marca || "—"}</td>
                            <td className="px-3 py-1.5 text-slate-500">{r.departamento || "—"}</td>
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
                {result.created} creados · {result.skipped} omitidos (duplicados)
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
