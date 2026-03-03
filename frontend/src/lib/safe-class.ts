// Whitelist of allowed Tailwind class patterns for status/severity colors.
// Only classes matching these patterns are rendered; anything else is stripped.

const ALLOWED_PATTERN = /^(text|bg|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|muted|primary|destructive|secondary|accent|foreground)[-/\w]*$/;

/**
 * Sanitizes a space-separated class string, keeping only known-safe Tailwind classes.
 * Prevents CSS class injection from user-editable fields (status colors, severity colors).
 */
export function safeClass(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .filter((cls) => ALLOWED_PATTERN.test(cls))
    .join(" ");
}
