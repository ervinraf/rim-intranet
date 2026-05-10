import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Intranet RIM Rigging",
  description: "Portal interno RIM Rigging",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-background antialiased" style={{ fontFamily: "'Calibri', 'Carlito', 'Lato', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
