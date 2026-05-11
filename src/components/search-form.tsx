"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { validatePackageName } from "@/lib/validation"

interface SearchFormProps {
  onSearch: (name: string) => void
  isLoading: boolean
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const result = validatePackageName(value)
    if (!result.valid) {
      setError(result.error ?? "Invalid name")
      setWarnings([])
      return
    }
    setError(null)
    setWarnings(result.warnings ?? [])
    onSearch(value.trim())
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
    if (error) {
      const result = validatePackageName(e.target.value)
      if (result.valid) setError(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={handleChange}
          placeholder="Enter a package name..."
          aria-invalid={!!error || undefined}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {isLoading ? "Checking..." : "Check"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && warnings.length > 0 && (
        <p className="text-xs text-muted-foreground">{warnings[0]}</p>
      )}
    </form>
  )
}
