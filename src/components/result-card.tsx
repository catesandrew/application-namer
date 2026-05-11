"use client"

import { useState } from "react"
import { CheckCircle, XCircle, AlertTriangle, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RegistryId, RegistryResult } from "@/lib/types"

const REGISTRY_NAMES: Record<RegistryId, string> = {
  npm: "npm",
  "homebrew-formulae": "Homebrew",
  "homebrew-cask": "Homebrew Cask",
  pypi: "PyPI",
  github: "GitHub",
}

interface ResultCardProps {
  registryId: RegistryId
  result: RegistryResult
}

export default function ResultCard({ registryId, result }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false)
  const displayName = REGISTRY_NAMES[registryId]

  const statusConfig = {
    available: {
      icon: CheckCircle,
      label: "Available",
      className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    },
    taken: {
      icon: XCircle,
      label: "Taken",
      className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    },
    error: {
      icon: AlertTriangle,
      label: "Error",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    },
    rate_limited: {
      icon: Clock,
      label: "Rate Limited",
      className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    },
  }

  const config = statusConfig[result.status]
  const Icon = config.icon
  const hasDetails =
    result.status === "taken" &&
    (result.description ||
      result.extra?.version ||
      result.extra?.downloads ||
      result.extra?.homepage ||
      result.url)

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{displayName}</CardTitle>
          <Badge variant="outline" className={config.className}>
            <Icon className="size-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      {result.status === "taken" && hasDetails && (
        <CardContent className="space-y-2">
          {result.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {expanded ? "Show less" : "Show more"}
          </button>
          {expanded && (
            <dl className="space-y-1 text-xs">
              {result.extra?.version != null && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Version:</dt>
                  <dd>{String(result.extra.version)}</dd>
                </div>
              )}
              {result.extra?.downloads != null && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Downloads:</dt>
                  <dd>{String(result.extra.downloads)}</dd>
                </div>
              )}
              {result.extra?.homepage != null && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Homepage:</dt>
                  <dd>
                    <a
                      href={String(result.extra.homepage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {String(result.extra.homepage)}
                    </a>
                  </dd>
                </div>
              )}
              {result.url && !result.extra?.homepage && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">URL:</dt>
                  <dd>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {result.url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      )}
      {result.status === "error" && result.error && (
        <CardContent>
          <p className="text-xs text-muted-foreground">{result.error}</p>
        </CardContent>
      )}
    </Card>
  )
}
