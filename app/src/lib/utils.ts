export function cn(...inputs: (string | boolean | undefined | null | Record<string, boolean>)[]) {
  return inputs
    .flatMap((input) => {
      if (!input) return [];
      if (typeof input === "string") return [input];
      if (typeof input === "object") return Object.entries(input).filter(([, v]) => v).map(([k]) => k);
      return [];
    })
    .join(" ");
}
export const cx = cn;
