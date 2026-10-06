import { useUI } from "@/store/ui";

export type BackupData = {
  version: number;
  exportedAt: string;
  saved: string[];
  visited: string[];
  notes: Record<string, string>;
  route?: {
    stops: string[];
    override?: Record<string, string>;
    pujaNight?: boolean;
    day?: string;
  };
};

/** Generates a downloadable JSON backup blob of all user data. */
export function generateBackupJSON(): string {
  const state = useUI.getState();
  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    saved: state.saved,
    visited: state.visited,
    notes: state.notes,
    route: {
      stops: state.route.stops,
      override: state.route.override as Record<string, string>,
      pujaNight: state.route.pujaNight,
      day: state.route.day,
    },
  };
  return JSON.stringify(backup, null, 2);
}

/** Triggers a browser download of the backup file. */
export function downloadBackupFile() {
  const json = generateBackupJSON();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pujoguide-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parses and imports a JSON backup string into the Zustand store. */
export function restoreBackupJSON(jsonStr: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonStr) as Partial<BackupData>;
    if (!data || typeof data !== "object") {
      return { success: false, message: "Invalid backup format: Not a JSON object." };
    }

    const state = useUI.getState();
    if (Array.isArray(data.saved)) {
      state.saved.forEach((s) => {
        if (!data.saved?.includes(s)) state.toggleSaved(s);
      });
      data.saved.forEach((s) => {
        if (!state.saved.includes(s)) state.toggleSaved(s);
      });
    }

    if (Array.isArray(data.visited)) {
      state.visited.forEach((s) => {
        if (!data.visited?.includes(s)) state.toggleVisited(s);
      });
      data.visited.forEach((s) => {
        if (!state.visited.includes(s)) state.toggleVisited(s);
      });
    }

    if (data.notes && typeof data.notes === "object") {
      Object.entries(data.notes).forEach(([slug, text]) => {
        state.setNote(slug, text);
      });
    }

    if (data.route && Array.isArray(data.route.stops)) {
      state.setStops(data.route.stops);
    }

    return { success: true, message: "Personal data and itinerary restored successfully!" };
  } catch (err) {
    return { success: false, message: `Failed to parse backup JSON: ${(err as Error).message}` };
  }
}
