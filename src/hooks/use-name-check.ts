"use client";

import { useState, useRef } from "react";
import type { CheckResponse, SuggestResponse } from "@/lib/types";

interface NameCheckState {
  query: string;
  results: CheckResponse | null;
  suggestions: SuggestResponse | null;
  selectedProvider: string | null;
  isChecking: boolean;
  isSuggesting: boolean;
  error: string | null;
}

export function useNameCheck() {
  const [state, setState] = useState<NameCheckState>({
    query: "",
    results: null,
    suggestions: null,
    selectedProvider: null,
    isChecking: false,
    isSuggesting: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  async function checkName(name: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({
      ...prev,
      query: name,
      isChecking: true,
      error: null,
      results: null,
      suggestions: null,
    }));

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          isChecking: false,
          error: data.error ?? "Check failed",
        }));
        return;
      }

      const data: CheckResponse = await res.json();
      setState((prev) => ({ ...prev, isChecking: false, results: data }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: err instanceof Error ? err.message : "Check failed",
      }));
    }
  }

  async function suggestNames() {
    if (!state.query || !state.selectedProvider) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const takenOn = state.results
      ? Object.entries(state.results.results)
          .filter(([, r]) => r.status === "taken")
          .map(([id]) => id)
      : [];

    setState((prev) => ({ ...prev, isSuggesting: true, error: null }));

    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.query,
          provider: state.selectedProvider,
          context: { takenOn },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          isSuggesting: false,
          error: data.error ?? "Suggest failed",
        }));
        return;
      }

      const data: SuggestResponse = await res.json();
      setState((prev) => ({ ...prev, isSuggesting: false, suggestions: data }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        isSuggesting: false,
        error: err instanceof Error ? err.message : "Suggest failed",
      }));
    }
  }

  function setProvider(id: string) {
    setState((prev) => ({ ...prev, selectedProvider: id }));
  }

  return { ...state, checkName, suggestNames, setProvider };
}
