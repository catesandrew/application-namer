export type RegistryId =
  | "npm"
  | "homebrew-formulae"
  | "homebrew-cask"
  | "pypi"
  | "github";

export type RegistryStatus = "available" | "taken" | "error" | "rate_limited";

export interface RegistryResult {
  status: RegistryStatus;
  name: string;
  description?: string;
  url?: string;
  extra?: Record<string, unknown>;
  error?: string;
}

export interface CheckResponse {
  results: Record<RegistryId, RegistryResult>;
  warnings?: string[];
}

export interface SuggestionResult {
  name: string;
  results: Record<RegistryId, RegistryResult>;
}

export interface SuggestResponse {
  suggestions: SuggestionResult[];
  errors?: string[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
}

export interface NameContext {
  takenOn: string[];
}
