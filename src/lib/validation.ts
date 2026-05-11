export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export function validatePackageName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Name cannot be empty" };
  }

  if (name.startsWith("@")) {
    return { valid: false, error: "Name cannot start with '@'" };
  }

  if (name.length > 214) {
    return { valid: false, error: "Name cannot exceed 214 characters" };
  }

  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    return {
      valid: false,
      error:
        "Name must start with a lowercase letter or digit and contain only lowercase letters, digits, hyphens, underscores, or dots",
    };
  }

  const warnings: string[] = [];
  if (/[-_.]/.test(name)) {
    warnings.push(
      "PyPI normalizes hyphens, underscores, and dots as equivalent"
    );
  }

  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}
