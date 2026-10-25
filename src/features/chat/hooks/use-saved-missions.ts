"use client";

import { useCallback, useSyncExternalStore } from "react";

import { useSessionUserId } from "@/features/auth/hooks/use-session-user-id";
import type { Mission } from "@/features/missions/mission";

const STORAGE_KEY_PREFIX = "aido.saved-missions.v2.";
/** Before v2 the list belonged to the browser, so every account on it saw the same missions. */
const LEGACY_STORAGE_KEY = "aido.saved-missions.v1";
const EMPTY: SavedMission[] = [];

export type SavedMission = Pick<
  Mission,
  "id" | "title" | "organizationName" | "applyUrl" | "location" | "locationMode" | "commitment" | "startDate" | "endDate"
>;

const listeners = new Set<() => void>();
const snapshots = new Map<string, SavedMission[]>();

function readStorage(key: string): SavedMission[] {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedMission[]) : [];
  } catch {
    return [];
  }
}

function getSnapshot(key: string): SavedMission[] {
  const cached = snapshots.get(key);
  if (cached) return cached;
  const stored = readStorage(key);
  snapshots.set(key, stored);
  return stored;
}

function write(key: string, next: SavedMission[]): void {
  snapshots.set(key, next);
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode, quota). Saved missions then last for this visit only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent): void => {
    if (!event.key?.startsWith(STORAGE_KEY_PREFIX)) return;
    snapshots.delete(event.key);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function toSaved(mission: Mission): SavedMission {
  const { id, title, organizationName, applyUrl, location, locationMode, commitment, startDate, endDate } = mission;
  return { id, title, organizationName, applyUrl, location, locationMode, commitment, startDate, endDate };
}

export interface SavedMissionsApi {
  /** Saving needs an account: signed-out visitors see no save button and no list. */
  enabled: boolean;
  saved: SavedMission[];
  isSaved: (missionId: string) => boolean;
  toggle: (mission: Mission) => void;
  remove: (missionId: string) => void;
}

/** Saved missions are kept in this browser, one list per signed-in account. */
export function useSavedMissions(): SavedMissionsApi {
  const userId = useSessionUserId();
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;

  const saved = useSyncExternalStore(
    subscribe,
    () => (storageKey ? getSnapshot(storageKey) : EMPTY),
    () => EMPTY,
  );

  const isSaved = useCallback((missionId: string) => saved.some((mission) => mission.id === missionId), [saved]);

  const remove = useCallback(
    (missionId: string) => {
      if (!storageKey) return;
      write(storageKey, getSnapshot(storageKey).filter((mission) => mission.id !== missionId));
    },
    [storageKey],
  );

  const toggle = useCallback(
    (mission: Mission) => {
      if (!storageKey) return;
      const current = getSnapshot(storageKey);
      write(
        storageKey,
        current.some((entry) => entry.id === mission.id)
          ? current.filter((entry) => entry.id !== mission.id)
          : [toSaved(mission), ...current],
      );
    },
    [storageKey],
  );

  return { enabled: storageKey !== null, saved, isSaved, toggle, remove };
}
