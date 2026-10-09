/**
 * Password policy for account registration.
 */

/**
 * Minimum accepted password length.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Maximum accepted password length.
 */
export const PASSWORD_MAX_LENGTH = 15;

/**
 * Single password requirement.
 */
export interface PasswordRule {
  /** Stable identifier. */
  id: "length" | "lowercase" | "uppercase" | "number" | "symbol";
  /** User-facing description shown in the checklist. */
  label: string;
  /** Returns true when the value satisfies the requirement. */
  test: (value: string) => boolean;
}

/**
 * Registration password requirements.
 */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "De 8 a 15 caracteres",
    test: (value: string) => value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: "lowercase",
    label: "Una letra minúscula (a–z)",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "uppercase",
    label: "Una letra mayúscula (A–Z)",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "Un número (0–9)",
    test: (value: string) => /[0-9]/.test(value),
  },
  {
    id: "symbol",
    label: "Un símbolo (!@#$%…)",
    test: (value: string) => /[^A-Za-z0-9\s]/.test(value),
  },
];

/**
 * Requirement paired with its live evaluation result.
 */
export interface PasswordRuleResult {
  /** Evaluated requirement. */
  rule: PasswordRule;
  /** Whether the value satisfies the requirement. */
  passed: boolean;
}

/**
 * Evaluates every requirement against the given value.
 */
export function evaluatePassword(value: string): PasswordRuleResult[] {
  return PASSWORD_RULES.map((rule) => ({ rule, passed: rule.test(value) }));
}

/**
 * Returns true when the value satisfies every requirement.
 */
export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}
