"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Upload, FolderOpen, Folder, Building2 } from "lucide-react"
import { DocumentCard } from "@/components/documents/document-card"
import { UploadModal } from "@/components/documents/upload-modal"

export type PermissionLevel = "VER" | "COMENTAR" | "EDITAR" | "DESCARGAR" | null

interface Doc {
  id: string
  name: string
  description?: string | null
  fileName: string
  fileUrl: string
  fileSize?: number | null
  mimeType?: string | null
  version: number
  updatedAt: string
  effectiveLevel: PermissionLevel
  department?: { id: string; name: string } | null
  category?: { id: string; name: string } | null
  _count: { versions: number }
}

interface Department { id: string; name: string }
interface Category { id: string; name: string }

interface Props {
  documents: Doc[]
  departments: Department[]
  categories: Category[]
  isAdmin: boolean
  userDeptId: string | null
}

export function DocumentsClient({ documents: initial, departments, categories, isAdmin, userDeptId }: Props) {
  const [documents, setDocuments] = useState(initial)
  const [search, setSearch] = useState("")
  const [showUpload, setShowUpload] = useState(false)

  // Departamento activo: para no-admin empieza en su depto, para admin en "all"
  const [activeDept, setActiveDept] = useState<string>(
    !isAdmin && userDeptId ? userDeptId : "all"
  )

  // Deptos que tienen documentos
  const deptOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    for (const doc of documents) {
      const id = doc.department?.id ?? "general"
      const name = doc.department?.name ?? "General"
      if (!map.has(id)) map.set(id, { id, name, count: 0 })
      map.get(id)!.count++
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [documents])

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase())
      const matchDept =
        activeDept === "all" ||
        (d.department?.id ?? "general") === activeDept
      return matchSearch && matchDept
    })
  }, [documents, search, activeDept])

  function handleUploadSuccess(newDoc: Doc) {
    setDocuments((prev) => [newDoc, ...prev])
    setShowUpload(false)
  }

  function handleNewVersion(docId: string) {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, version: d.version + 1, _count: { versions: d._count.versions + 1 } } : d
      )
    )
  }

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar de departamentos */}
      <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-slate-50 p-4 space-y-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Departamentos</p>

        {isAdmin && (
          <button
            onClick={() => setActiveDept("all")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              activeDept === "all"
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Todos</span>
            <span className={`ml-auto text-xs ${activeDept === "all" ? "text-slate-300" : "text-slate-400"}`}>
              {documents.length}
            </span>
          </button>
        )}

        {deptOptions.map((dept) => (
          <button
            key={dept.id}
            onClick={() => setActiveDept(dept.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              activeDept === dept.id
                ? "bg-slate-800 text-white"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            {activeDept === dept.id
              ? <FolderOpen className="w-4 h-4 flex-shrink-0" />
              : <Folder className="w-4 h-4 flex-shrink-0" />
            }
            <span className="truncate">{dept.name}</span>
            <span className={`ml-auto text-xs ${activeDept === dept.id ? "text-slate-300" : "text-slate-400"}`}>
              {dept.count}
            </span>
          </button>
        ))}

        {deptOptions.length === 0 && (
          <p className="text-xs text-slate-400 px-3 py-2">Sin documentos</p>
        )}
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 p-8 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {activeDept === "all"
                ? "Todos los documentos"
                : deptOptions.find((d) => d.id === activeDept)?.name ?? "Documentos"}
            </h1>
            <p className="text-slate-500 mt-1 text-sm">{filtered.length} documentos</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Subir documento
            </Button>
          )}
        </div>

        {/* Busqueda */}
        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grid de documentos */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {search ? "Sin resultados para tu busqueda" : "Sin documentos en este departamento"}
            </p>
            {isAdmin && !search && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowUpload(true)}>
                Subir el primero
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isAdmin={isAdmin}
                onNewVersion={() => handleNewVersion(doc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          departments={departments}
          categories={categories}
          userDeptId={userDeptId}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  )
}
