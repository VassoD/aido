"use client";

import { HeaderBar } from "@/features/ui/HeaderBar";

interface AppHeaderProps {
  savedCount: number;
  onOpenSaved: () => void;
  onRestart: () => void;
}

export function AppHeader({ savedCount, onOpenSaved, onRestart }: AppHeaderProps): React.ReactElement {
  return <HeaderBar onLogoClick={onRestart} savedCount={savedCount} onOpenSaved={onOpenSaved} />;
}
