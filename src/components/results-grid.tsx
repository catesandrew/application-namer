"use client"

import ResultCard from "@/components/result-card"
import type { RegistryId, RegistryResult } from "@/lib/types"

const REGISTRY_IDS: RegistryId[] = ["npm", "homebrew-formulae", "homebrew-cask", "pypi", "github"]

interface ResultsGridProps {
  results: Record<RegistryId, RegistryResult> | null
  warnings?: string[]
}

export default function ResultsGrid({ results, warnings }: ResultsGridProps) {
  if (!results) return null

  return (
    <div className="space-y-3">
      {warnings && warnings.length > 0 && (
        <p className="text-sm text-muted-foreground">{warnings.join(" · ")}</p>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {REGISTRY_IDS.map((id) => (
          <ResultCard key={id} registryId={id} result={results[id]} />
        ))}
      </div>
    </div>
  )
}
