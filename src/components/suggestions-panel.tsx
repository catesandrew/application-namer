"use client"

import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import type { RegistryId, SuggestionResult } from "@/lib/types"

const REGISTRY_IDS: RegistryId[] = ["npm", "homebrew-formulae", "homebrew-cask", "pypi", "github"]

const REGISTRY_LABELS: Record<RegistryId, string> = {
  npm: "npm",
  "homebrew-formulae": "Brew",
  "homebrew-cask": "Cask",
  pypi: "PyPI",
  github: "GH",
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500",
  taken: "bg-red-500",
  error: "bg-yellow-500",
  rate_limited: "bg-blue-500",
}

class SuggestionsErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="text-sm text-muted-foreground">
          Something went wrong with suggestions
        </p>
      )
    }
    return this.props.children
  }
}

function SuggestionCard({ suggestion }: { suggestion: SuggestionResult }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-sm font-medium">{suggestion.name}</span>
      <div className="flex items-center gap-2">
        {REGISTRY_IDS.map((id) => {
          const result = suggestion.results[id]
          if (!result) return null
          return (
            <div
              key={id}
              className="flex items-center gap-0.5"
              title={`${REGISTRY_LABELS[id]}: ${result.status}`}
            >
              <span className="text-xs text-muted-foreground">{REGISTRY_LABELS[id]}</span>
              <span
                className={`inline-block size-2 rounded-full ${STATUS_COLORS[result.status] ?? "bg-muted"}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface SuggestionsPanelProps {
  suggestions: SuggestionResult[] | null
  isLoading: boolean
  onSuggest: () => void
  hasProviders: boolean
  anyTaken: boolean
}

function SuggestionsPanelInner({
  suggestions,
  isLoading,
  onSuggest,
  hasProviders,
  anyTaken,
}: SuggestionsPanelProps) {
  const canSuggest = hasProviders && anyTaken
  const buttonTitle = !hasProviders
    ? "No AI providers configured"
    : !anyTaken
      ? "Search for a taken name first"
      : undefined

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Suggestions</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onSuggest}
          disabled={!canSuggest || isLoading}
          title={buttonTitle}
        >
          {isLoading ? "Generating..." : "Suggest alternatives"}
        </Button>
      </div>
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
          <p className="text-xs text-muted-foreground">
            Generating and checking suggestions...
          </p>
        </div>
      )}
      {!isLoading && suggestions && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <SuggestionCard key={s.name} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SuggestionsPanel(props: SuggestionsPanelProps) {
  return (
    <SuggestionsErrorBoundary>
      <SuggestionsPanelInner {...props} />
    </SuggestionsErrorBoundary>
  )
}
