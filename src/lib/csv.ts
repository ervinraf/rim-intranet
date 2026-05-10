export function downloadCsv(rows: string[][], filename: string) {
  const content = rows
    .map((row) =>
      row.map((cell) => {
        const s = String(cell ?? "").replace(/"/g, '""')
        return /[,"\n\r]/.test(s) ? `"${s}"` : s
      }).join(",")
    )
    .join("\r\n")

  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
