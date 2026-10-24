"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { Mission } from "@/features/missions/mission";

const STORAGE_KEY = "aido.saved-missions.v1";
const EMPTY: SavedMission[] = [];

export type SavedMission = Pick<
  Mission,
  "id" | "title" | "organizationName" | "applyUrl" | "location" | "locationMode" | "commitment" | "startDate" | "endDate"
>;

const listeners = new Set<() => void>();
let snapshot: SavedMission[] | null = null;

function readStorage(): SavedMission[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedMission[]) : [];
  } catch {
    return [];
  }
}

function getSnapshot(): SavedMission[] {
  snapshot ??= readStorage();
  return snapshot;
}

function write(next: SavedMission[]): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode, quota). Saved missions then last for this visit only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY) return;
    snapshot = readStorage();
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
  saved: SavedMission[];
  isSaved: (missionId: string) => boolean;
  toggle: (mission: Mission) => void;
  remove: (missionId: string) => void;
}

/** Saved missions live in this browser only; there are no accounts in v1. */
export function useSavedMissions(): SavedMissionsApi {
  const saved = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const isSaved = useCallback((missionId: string) => saved.some((mission) => mission.id === missionId), [saved]);

  const remove = useCallback((missionId: string) => {
    write(getSnapshot().filter((mission) => mission.id !== missionId));
  }, []);

  const toggle = useCallback((mission: Mission) => {
    const current = getSnapshot();
    write(
      current.some((entry) => entry.id === mission.id)
        ? current.filter((entry) => entry.id !== mission.id)
        : [toSaved(mission), ...current],
    );
  }, []);

  return { saved, isSaved, toggle, remove };
}
