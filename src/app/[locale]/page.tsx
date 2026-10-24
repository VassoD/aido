import { setRequestLocale } from "next-intl/server";

import { ChatExperience } from "@/features/chat/components/ChatExperience";

export default async function HomePage({ params }: PageProps<"/[locale]">): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ChatExperience />;
}
