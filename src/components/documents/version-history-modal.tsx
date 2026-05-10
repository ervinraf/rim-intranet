"use client"

import { useEffect, useState } from "react"
import { X, Download, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Version {
  id: string
  version: number
  fileName: string
  fileUrl: string
  note?: string | null
  createdAt: string
}

interface VersionHistoryModalProps {
  documentId: string
  documentName: string
  currentVersion: number
  onClose: () => void
}

export function VersionHistoryModal({
  documentId, documentName, currentVersion, onClose,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/documents/${documentId}/versions`)
      .then((r) => r.json())
      .then(setVersions)
      .finally(() => setLoading(false))
  }, [documentId])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Historial de versiones</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{documentName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    v.version === currentVersion
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">v{v.version}</span>
                      {v.version === currentVersion && (
                        <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {format(new Date(v.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                    {v.note && (
                      <p className="text-xs text-slate-500 mt-0.5 italic">{v.note}</p>
                    )}
                  </div>
                  <a href={v.fileUrl} download={v.fileName}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="w-4 h-4 text-slate-500" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} className="w-full">Cerrar</Button>
        </div>
      </div>
    </div>
  )
}
