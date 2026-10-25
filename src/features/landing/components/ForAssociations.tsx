import { useTranslations } from "next-intl";

import { PRIMARY_BUTTON } from "@/features/ui/styles";
import { Link } from "@/i18n/navigation";

const POINT_KEYS = ["draft", "verified", "summary", "inbox"] as const;

/** The other side of the marketplace: associations land on the volunteer home too, so tell them it is for them. */
export function ForAssociations(): React.ReactElement {
  const t = useTranslations("landing.associations");

  return (
    <section aria-labelledby="associations-title" className="bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold tracking-wider text-sun uppercase">{t("eyebrow")}</p>
          <h2
            id="associations-title"
            className="display-title max-w-[22ch] text-[2.3rem] leading-[1.02] text-balance text-paper sm:text-[3.2rem]"
          >
            {t("title")}
          </h2>
          <p className="max-w-[52ch] text-lg text-paper/80">{t("lede")}</p>
        </div>

        <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {POINT_KEYS.map((key) => (
            <li key={key} className="flex gap-3">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0 text-sun">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-bold text-paper">{t(`points.${key}.title`)}</h3>
                <p className="text-paper/80">{t(`points.${key}.body`)}</p>
              </div>
            </li>
          ))}
        </ul>

        <Link href="/asso" className={`${PRIMARY_BUTTON} w-fit`}>
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
