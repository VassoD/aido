import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const STEP_KEYS = ["tell", "match", "apply"] as const;

/** Below the hero, for visitors who scroll before typing: what happens once they do. */
export function HowItWorks(): React.ReactElement {
  const t = useTranslations("landing.how");

  return (
    <section aria-labelledby="how-title" className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold tracking-wider text-leaf uppercase">{t("eyebrow")}</p>
        <h2 id="how-title" className="display-title max-w-[20ch] text-[2.1rem] leading-[1.02] text-balance text-ink sm:text-[2.8rem]">
          {t("title")}
        </h2>
      </div>

      <ol className="grid gap-6 sm:grid-cols-3">
        {STEP_KEYS.map((key, index) => (
          <li key={key} className="flex flex-col gap-2">
            <span
              aria-hidden="true"
              className="display-label grid size-11 place-items-center rounded-full bg-sun text-lg text-ink-deep"
            >
              {index + 1}
            </span>
            <h3 className="mt-1 text-lg leading-tight font-bold text-ink">{t(`steps.${key}.title`)}</h3>
            <p className="text-text">{t(`steps.${key}.body`)}</p>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 rounded-3xl bg-leaf-soft p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
        <span aria-hidden="true" className="text-4xl">
          🏅
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="font-bold text-ink">{t("after.title")}</h3>
          <p className="text-text">{t("after.body")}</p>
        </div>
        <Link href="/me" className="font-bold whitespace-nowrap text-ink underline underline-offset-4">
          {t("after.cta")}
        </Link>
      </div>
    </section>
  );
}
