import "server-only";

import type { AppLocale } from "@/i18n/routing";

/** Escapes text placed inside the HTML emails; every dynamic value goes through this. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface Layout {
  heading: string;
  paragraphs: string[];
  quote?: string;
  actionLabel: string;
  actionUrl: string;
  /** Notifications are French for now; the sign-in email follows the interface language. */
  locale?: AppLocale;
}

const FOOTER: Record<AppLocale, string> = {
  fr: "Aido, le bénévolat qui vous ressemble.",
  en: "Aido, volunteering that fits you.",
};

/** One simple, table-free layout that renders in every mail client, in Aido's colours. */
function renderLayout({ heading, paragraphs, quote, actionLabel, actionUrl, locale = "fr" }: Layout): {
  html: string;
  text: string;
} {
  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#fff3c9;font-family:Arial,Helvetica,sans-serif;color:#24342c;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;">
    <p style="margin:0 0 20px;font-size:22px;font-weight:800;color:#12261d;">aido</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#12261d;">${escapeHtml(heading)}</h1>
    ${paragraphs.map((paragraph) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;">${escapeHtml(paragraph)}</p>`).join("\n    ")}
    ${quote ? `<p style="margin:16px 0;padding:12px 16px;background:#fff3c9;border-radius:12px;font-size:16px;line-height:1.55;">${escapeHtml(quote)}</p>` : ""}
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#ffcd38;color:#0b1913;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;">${escapeHtml(actionLabel)}</a>
    </p>
  </div>
  <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#5b6a62;text-align:center;">${FOOTER[locale]}</p>
</body>
</html>`;
  const text = [heading, "", ...paragraphs, ...(quote ? ["", `« ${quote} »`] : []), "", `${actionLabel} : ${actionUrl}`].join("\n");
  return { html, text };
}

const SIGN_IN_COPY: Record<AppLocale, { subject: string; heading: string; paragraphs: string[]; actionLabel: string }> = {
  fr: {
    subject: "Votre lien de connexion à Aido",
    heading: "Connexion à Aido",
    paragraphs: [
      "Cliquez sur le bouton pour vous connecter. Pas de mot de passe : le lien ne sert qu'une fois.",
      "Si vous n'avez rien demandé, ignorez simplement cet email.",
    ],
    actionLabel: "Me connecter",
  },
  en: {
    subject: "Your Aido sign-in link",
    heading: "Sign in to Aido",
    paragraphs: [
      "Click the button to sign in. No password: the link works only once.",
      "If you didn't ask for it, just ignore this email.",
    ],
    actionLabel: "Sign me in",
  },
};

export function signInEmail(input: { signInUrl: string; locale: AppLocale }): { subject: string; html: string; text: string } {
  const { subject, ...copy } = SIGN_IN_COPY[input.locale];
  return { subject, ...renderLayout({ ...copy, actionUrl: input.signInUrl, locale: input.locale }) };
}

export function newApplicationEmail(input: {
  volunteerName: string;
  missionTitle: string;
  fitSummary: string | null;
  inboxUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Nouvelle candidature de ${input.volunteerName} pour « ${input.missionTitle} »`;
  return {
    subject,
    ...renderLayout({
      heading: `${input.volunteerName} veut vous aider`,
      paragraphs: [
        `Une nouvelle candidature est arrivée pour votre mission « ${input.missionTitle} ».`,
        "Ses réponses et le résumé préparé par Aido vous attendent dans votre espace.",
      ],
      quote: input.fitSummary ?? undefined,
      actionLabel: "Voir la candidature",
      actionUrl: input.inboxUrl,
    }),
  };
}

export function applicationDecisionEmail(input: {
  volunteerName: string;
  organizationName: string;
  missionTitle: string;
  accepted: boolean;
  applicationsUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = input.accepted
    ? `${input.organizationName} a accepté votre candidature`
    : `Réponse de ${input.organizationName} à votre candidature`;
  return {
    subject,
    ...renderLayout({
      heading: input.accepted ? `Bonne nouvelle, ${input.volunteerName} !` : `Merci, ${input.volunteerName}`,
      paragraphs: input.accepted
        ? [
            `${input.organizationName} a accepté votre candidature pour « ${input.missionTitle} ».`,
            "L'association va vous contacter pour la suite. Vous pouvez aussi lui écrire depuis Aido.",
          ]
        : [
            `${input.organizationName} ne peut pas donner suite à votre candidature pour « ${input.missionTitle} » cette fois-ci.`,
            "Merci pour votre envie d'aider : d'autres missions vous attendent sur Aido.",
          ],
      actionLabel: input.accepted ? "Voir ma candidature" : "Trouver une autre mission",
      actionUrl: input.applicationsUrl,
    }),
  };
}

export function missionCompletedEmail(input: {
  volunteerName: string;
  organizationName: string;
  missionTitle: string;
  badgesUrl: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: `Merci pour « ${input.missionTitle} » : un nouveau badge vous attend`,
    ...renderLayout({
      heading: `Merci, ${input.volunteerName} !`,
      paragraphs: [
        `${input.organizationName} confirme que vous avez mené à bien la mission « ${input.missionTitle} ».`,
        "Elle compte désormais dans votre parcours de bénévole : découvrez les badges débloqués dans votre espace.",
      ],
      actionLabel: "Voir mes badges",
      actionUrl: input.badgesUrl,
    }),
  };
}

export function newMessageEmail(input: {
  senderName: string;
  missionTitle: string;
  body: string;
  threadUrl: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: `Nouveau message de ${input.senderName}`,
    ...renderLayout({
      heading: `${input.senderName} vous a écrit`,
      paragraphs: [`À propos de la mission « ${input.missionTitle} » :`],
      quote: input.body,
      actionLabel: "Répondre",
      actionUrl: input.threadUrl,
    }),
  };
}
