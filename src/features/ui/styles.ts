/** Shared class lists so every screen uses the same controls. */

/** Sun pill: the one action to take now. */
export const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-sun px-5 py-2.5 font-bold text-ink-deep shadow-[0_6px_16px_-8px_rgb(18_38_29/0.45)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-sun-strong hover:shadow-[0_10px_20px_-10px_rgb(18_38_29/0.5)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none";

/** Ink outline pill: secondary actions. */
export const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-ink px-5 py-2 font-bold text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-40";

export const TEXT_INPUT =
  "w-full rounded-xl border-2 border-line bg-card px-3.5 py-2.5 text-text placeholder:text-muted transition-colors focus:border-ink focus:outline-none";

export const FIELD_LABEL = "text-sm font-bold text-ink";

export const CARD = "rounded-3xl border border-line bg-card p-5 shadow-[0_12px_32px_-24px_rgb(18_38_29/0.35)] sm:p-7";

export const PAGE_TITLE = "display-title text-[2.5rem] leading-[1.02] text-ink sm:text-[3.4rem]";
