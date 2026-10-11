import type { MessageKey } from "@/i18n";

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
  /** Message key of the description shown in the checklist. */
  labelKey: MessageKey;
  /** Returns true when the value satisfies the requirement. */
  test: (value: string) => boolean;
}

/**
 * Registration password requirements.
 */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    labelKey: "auth.rule.length",
    test: (value: string) => value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: "lowercase",
    labelKey: "auth.rule.lowercase",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "uppercase",
    labelKey: "auth.rule.uppercase",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    labelKey: "auth.rule.number",
    test: (value: string) => /[0-9]/.test(value),
  },
  {
    id: "symbol",
    labelKey: "auth.rule.symbol",
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
 *
 * @param value - Password being typed.
 * @returns Each requirement with its result.
 */
export function evaluatePassword(value: string): PasswordRuleResult[] {
  return PASSWORD_RULES.map((rule) => ({ rule, passed: rule.test(value) }));
}

/**
 * Tells whether the value satisfies every requirement.
 *
 * @param value - Password being typed.
 * @returns True when all requirements pass.
 */
export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}
