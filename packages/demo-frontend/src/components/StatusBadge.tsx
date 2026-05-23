import type {TaskStatus} from "@questlens/sdk";

const PALETTE: Record<TaskStatus, {bg: string; fg: string; label: string}> = {
  none: {bg: "transparent", fg: "var(--muted)", label: "none"},
  created: {bg: "rgba(94, 234, 212, 0.15)", fg: "var(--accent)", label: "open"},
  accepted: {bg: "rgba(251, 191, 36, 0.15)", fg: "var(--accent-warn)", label: "in progress"},
  "pending-finalization": {bg: "rgba(251, 191, 36, 0.15)", fg: "var(--accent-warn)", label: "challenge window"},
  settled: {bg: "rgba(16, 185, 129, 0.15)", fg: "#10b981", label: "settled"},
  refunded: {bg: "rgba(148, 163, 184, 0.15)", fg: "var(--muted)", label: "refunded"},
  slashed: {bg: "rgba(239, 68, 68, 0.15)", fg: "var(--accent-fail)", label: "slashed"},
};

export function StatusBadge({status}: {status: TaskStatus}) {
  const palette = PALETTE[status] ?? PALETTE.none;
  return (
    <span
      style={{
        background: palette.bg,
        color: palette.fg,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "3px 8px",
        borderRadius: 999,
        display: "inline-block",
      }}
    >
      {palette.label}
    </span>
  );
}
