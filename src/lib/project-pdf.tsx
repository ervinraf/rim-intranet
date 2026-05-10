import {
  Document, Page, Text, View, StyleSheet, Image, Font,
} from "@react-pdf/renderer"
import { format } from "date-fns"
import { es } from "date-fns/locale"

Font.register({
  family: "Calibri",
  fonts: [
    { src: "https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wWw.ttf", fontWeight: "normal" },
    { src: "https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPBA.ttf", fontWeight: "bold" },
  ],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: "Calibri",
    fontSize: 10,
    color: "#1e293b",
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "2 solid #f59e0b",
  },
  logo: {
    width: 80,
    height: 40,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  companyTagline: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  reportDate: {
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "right",
  },
  projectTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  projectMeta: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 3,
  },
  statusBadge: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginTop: 6,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1 solid #e2e8f0",
  },
  progressBar: {
    height: 14,
    backgroundColor: "#f1f5f9",
    borderRadius: 7,
    marginBottom: 4,
  },
  progressFill: {
    height: 14,
    backgroundColor: "#f59e0b",
    borderRadius: 7,
  },
  progressLabel: {
    fontSize: 9,
    color: "#64748b",
    textAlign: "right",
    marginBottom: 16,
  },
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottom: "1 solid #e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableColTask: { flex: 3, fontSize: 9 },
  tableColDate: { flex: 2, fontSize: 9, color: "#64748b" },
  tableColProgress: { flex: 1, fontSize: 9, textAlign: "right" },
  tableHeaderText: { fontSize: 9, fontWeight: "bold", color: "#64748b" },
  miniProgressBar: {
    height: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 2,
    marginTop: 3,
  },
  miniProgressFill: {
    height: 4,
    backgroundColor: "#f59e0b",
    borderRadius: 2,
  },
  updateRow: {
    marginBottom: 8,
    paddingLeft: 10,
    borderLeft: "2 solid #f59e0b",
  },
  updateText: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.4,
  },
  updateDate: {
    fontSize: 8,
    color: "#94a3b8",
    marginTop: 2,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  photo: {
    width: 115,
    height: 86,
    objectFit: "cover",
    borderRadius: 4,
  },
  photoCaption: {
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
    marginTop: 2,
    width: 115,
  },
  photoGroup: {
    marginBottom: 14,
  },
  photoGroupTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1 solid #e2e8f0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
  },
})

const statusLabels: Record<string, string> = {
  NUEVO: "Nuevo",
  EN_DESARROLLO: "En desarrollo",
  CERRADO: "Completado",
}

interface Props {
  project: any
  logoUrl?: string | null
  baseUrl: string
}

export function ProjectPDF({ project, logoUrl, baseUrl }: Props) {
  const portalUrl = `${baseUrl}/cliente?token=${project.accessToken}`
  const now = new Date()
  const tasksWithPhotos = project.tasks?.filter((t: any) => t.photos?.length > 0) ?? []
  const generalPhotos = project.photos?.filter((p: any) => !p.taskId) ?? []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {logoUrl ? (
              <Image src={`${baseUrl}${logoUrl}`} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>RIM Rigging</Text>
            )}
            <Text style={styles.companyTagline}>Reporte de avance de proyecto</Text>
          </View>
          <View>
            <Text style={styles.reportDate}>
              Generado: {format(now, "d 'de' MMMM yyyy", { locale: es })}
            </Text>
            <Text style={styles.reportDate}>{format(now, "HH:mm", { locale: es })} hrs</Text>
          </View>
        </View>

        {/* Project info */}
        <Text style={styles.projectTitle}>{project.name}</Text>
        <Text style={styles.projectMeta}>Cliente: {project.clientName}</Text>
        {project.location && (
          <Text style={styles.projectMeta}>Ubicacion: {project.location}</Text>
        )}
        {project.startDate && (
          <Text style={styles.projectMeta}>
            Inicio: {format(new Date(project.startDate), "d 'de' MMMM yyyy", { locale: es })}
            {project.endDate && ` — Entrega estimada: ${format(new Date(project.endDate), "d 'de' MMMM yyyy", { locale: es })}`}
          </Text>
        )}
        <View style={styles.statusBadge}>
          <Text>{statusLabels[project.status] ?? project.status}</Text>
        </View>

        {/* Progress */}
        <Text style={styles.sectionTitle}>Avance general del proyecto</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{project.progress}% completado</Text>

        {/* Tasks Gantt table */}
        {project.tasks?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Actividades</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableColTask, styles.tableHeaderText]}>Actividad</Text>
                <Text style={[styles.tableColDate, styles.tableHeaderText]}>Inicio</Text>
                <Text style={[styles.tableColDate, styles.tableHeaderText]}>Fin</Text>
                <Text style={[styles.tableColProgress, styles.tableHeaderText]}>Avance</Text>
              </View>
              {project.tasks.map((task: any) => (
                <View key={task.id} style={styles.tableRow}>
                  <View style={styles.tableColTask}>
                    <Text style={{ fontSize: 9, color: "#1e293b" }}>{task.name}</Text>
                    <View style={styles.miniProgressBar}>
                      <View style={[styles.miniProgressFill, { width: `${task.progress}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.tableColDate}>
                    {format(new Date(task.startDate), "d MMM yy", { locale: es })}
                  </Text>
                  <Text style={styles.tableColDate}>
                    {format(new Date(task.endDate), "d MMM yy", { locale: es })}
                  </Text>
                  <Text style={[styles.tableColProgress, { fontWeight: "bold", color: "#92400e" }]}>
                    {task.progress}%
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Updates */}
        {project.updates?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Bitacora de avances</Text>
            {project.updates.slice(0, 8).map((u: any) => (
              <View key={u.id} style={styles.updateRow}>
                <Text style={styles.updateText}>{u.note}</Text>
                <Text style={styles.updateDate}>
                  {format(new Date(u.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Photos by task */}
        {tasksWithPhotos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Registro fotografico</Text>
            {tasksWithPhotos.map((task: any) => (
              <View key={task.id} style={styles.photoGroup} wrap={false}>
                <Text style={styles.photoGroupTitle}>{task.name} — {task.progress}% completado</Text>
                <View style={styles.photosGrid}>
                  {task.photos.slice(0, 6).map((photo: any) => (
                    <View key={photo.id}>
                      <Image
                        src={photo.url.startsWith("http") ? photo.url : `${baseUrl}${photo.url}`}
                        style={styles.photo}
                      />
                      {photo.caption && (
                        <Text style={styles.photoCaption}>{photo.caption}</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Portal del cliente: {portalUrl}</Text>
          <Text style={styles.footerText}>RIM Rigging — Intranet</Text>
        </View>
      </Page>
    </Document>
  )
}
