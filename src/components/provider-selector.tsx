"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProviderInfo } from "@/lib/types"

interface ProviderSelectorProps {
  selectedProvider: string | null
  onSelect: (id: string) => void
  disabled?: boolean
}

export default function ProviderSelector({
  selectedProvider,
  onSelect,
  disabled,
}: ProviderSelectorProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data: ProviderInfo[]) => setProviders(data))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false))
  }, [])

  const availableProviders = providers.filter((p) => p.available)
  const noProviders = !loading && availableProviders.length === 0

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-foreground">AI Provider</label>
      <Select
        value={selectedProvider ?? ""}
        onValueChange={(value) => value && onSelect(value)}
        disabled={disabled || noProviders || loading}
      >
        <SelectTrigger
          className="w-48"
          title={noProviders ? "No AI providers configured" : undefined}
        >
          <SelectValue
            placeholder={
              loading ? "Loading..." : noProviders ? "No providers" : "Select provider"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {availableProviders.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
