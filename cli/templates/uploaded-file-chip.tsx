import { X, FileText, FileImage, File as FileIcon } from "lucide-react"
import { clsx } from "clsx"

interface UploadedFileChipProps {
  file: File
  onRemove: () => void
}

function getFileTypeInfo(file: File): { icon: typeof FileIcon; label: string } {
  const type = file.type
  if (type.startsWith("image/")) return { icon: FileImage, label: "Image" }
  if (type === "application/pdf") return { icon: FileText, label: "PDF" }
  if (type.startsWith("text/") || type.includes("word") || type.includes("document"))
    return { icon: FileText, label: "Document" }
  return { icon: FileIcon, label: "File" }
}

export function UploadedFileChip({ file, onRemove }: UploadedFileChipProps) {
  const { icon: Icon, label } = getFileTypeInfo(file)

  return (
    <div className="group relative flex items-center gap-2 h-12 w-[180px] shrink-0 rounded-lg border bg-background px-3">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm truncate">{file.name}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className={clsx(
          "absolute -top-1 -right-1 size-4 rounded-full",
          "flex items-center justify-center",
          "bg-muted text-foreground/60",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:text-foreground/80 cursor-pointer",
        )}
      >
        <X className="size-2.5" />
      </button>
    </div>
  )
}
