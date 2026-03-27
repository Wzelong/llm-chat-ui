import { FileText, FileImage, File as FileIcon } from "lucide-react"
import type { FileData } from "llm-chat-ui"

function getFileTypeInfo(file: FileData): { icon: typeof FileIcon; label: string } {
  const type = file.type
  if (type.startsWith("image/")) return { icon: FileImage, label: "Image" }
  if (type === "application/pdf") return { icon: FileText, label: "PDF" }
  if (type.startsWith("text/") || type.includes("word") || type.includes("document"))
    return { icon: FileText, label: "Document" }
  return { icon: FileIcon, label: "File" }
}

export function FileChip({ file }: { file: FileData }) {
  const { icon: Icon, label } = getFileTypeInfo(file)

  return (
    <div className="flex items-center gap-1.5 h-10 w-[110px] shrink-0 rounded-md border px-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs truncate">{file.name}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
