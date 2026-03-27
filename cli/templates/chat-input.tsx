import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from "react"
import { ArrowUp, Paperclip } from "lucide-react"
import { clsx } from "clsx"
import { UploadedFileChip } from "./uploaded-file-chip"

const MAX_HEIGHT = 120

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string, files?: File[]) => void
  isLoading?: boolean
  placeholder?: string
  enableFileUpload?: boolean
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading = false,
  placeholder = "Send a message...",
  enableFileUpload = false,
}: ChatInputProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isMultiline, setIsMultiline] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasFiles = files.length > 0
  const isExpanded = isMultiline || hasFiles

  const resize = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "0"
    const scrollHeight = Math.min(textarea.scrollHeight, MAX_HEIGHT)
    textarea.style.height = `${scrollHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? "auto" : "hidden"
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20
    setIsMultiline(textarea.scrollHeight > lineHeight * 1.5)
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  const handleSend = useCallback(() => {
    const message = value.trim()
    if ((!message && !hasFiles) || isLoading) return
    onChange("")
    const sendFiles = files.length > 0 ? files : undefined
    setFiles([])
    setIsMultiline(false)
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    onSend(message, sendFiles)
  }, [value, files, hasFiles, isLoading, onSend, onChange])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files
    if (newFiles && newFiles.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(newFiles)])
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const canSend = (value.trim() || hasFiles) && !isLoading

  return (
    <div
      className={clsx(
        "relative flex flex-col gap-1 border bg-background p-2 transition-colors",
        isExpanded ? "rounded-2xl" : "rounded-full",
        "focus-within:border-foreground/40",
      )}
    >
      {hasFiles && (
        <div className="flex gap-2 overflow-x-auto px-1 pt-1 pb-1">
          {files.map((file, index) => (
            <UploadedFileChip
              key={`${file.name}-${index}`}
              file={file}
              onRemove={() => handleRemoveFile(index)}
            />
          ))}
        </div>
      )}
      <div className="flex items-end">
        {enableFileUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={clsx(
                "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
                "text-muted-foreground hover:text-foreground cursor-pointer",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <Paperclip className="size-4" />
            </button>
          </>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            resize()
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none border-none bg-transparent px-2 py-1 text-sm leading-5 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          style={{ minHeight: 20, maxHeight: MAX_HEIGHT }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={clsx(
            "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
            canSend
              ? "cursor-pointer bg-foreground text-background hover:bg-foreground/80"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  )
}
