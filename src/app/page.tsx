"use client"

import Header from "@/components/header"
import SearchForm from "@/components/search-form"
import ResultsGrid from "@/components/results-grid"
import ProviderSelector from "@/components/provider-selector"
import SuggestionsPanel from "@/components/suggestions-panel"
import { useNameCheck } from "@/hooks/use-name-check"

export default function Home() {
  const hook = useNameCheck()

  const anyTaken = hook.results
    ? Object.values(hook.results.results).some((r) => r.status === "taken")
    : false

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-zinc-950">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8">
        <SearchForm onSearch={hook.checkName} isLoading={hook.isChecking} />
        {hook.error && (
          <p className="text-sm text-destructive">{hook.error}</p>
        )}
        <ResultsGrid results={hook.results?.results ?? null} warnings={hook.results?.warnings} />
        {hook.results && (
          <div className="space-y-4">
            <ProviderSelector
              selectedProvider={hook.selectedProvider}
              onSelect={hook.setProvider}
              disabled={hook.isChecking || hook.isSuggesting}
            />
            <SuggestionsPanel
              suggestions={hook.suggestions?.suggestions ?? null}
              isLoading={hook.isSuggesting}
              onSuggest={hook.suggestNames}
              hasProviders={hook.selectedProvider !== null}
              anyTaken={anyTaken}
            />
          </div>
        )}
      </main>
    </div>
  )
}
