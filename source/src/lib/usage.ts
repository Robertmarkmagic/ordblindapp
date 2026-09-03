// Best-effort monthly usage tracking (documents created, TTS seconds).
// Never blocks the primary action — a failed counter update is logged, not thrown.

import { overskill } from "@/lib/auth";

/** Current billing month as "YYYY-MM". */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getOrCreateCounter() {
  const month = currentMonth();
  const rows = await overskill.entities.usage_counter.filter({ month });
  if (rows && rows.length > 0) return rows[0];
  return overskill.entities.usage_counter.create({
    month,
    documents_created: 0,
    tts_seconds_used: 0,
  });
}

/**
 * Read this month's usage WITHOUT creating a row. Best-effort — returns zeros
 * on any error so a limit check never throws or blocks the UI.
 */
export async function getMonthlyUsage(): Promise<{
  documentsCreated: number;
  ttsSecondsUsed: number;
}> {
  try {
    const rows = await overskill.entities.usage_counter.filter({ month: currentMonth() });
    const r = rows && rows.length > 0 ? rows[0] : null;
    return {
      documentsCreated: Number(r?.documents_created) || 0,
      ttsSecondsUsed: Number(r?.tts_seconds_used) || 0,
    };
  } catch (err) {
    console.warn("[usage] read failed:", err);
    return { documentsCreated: 0, ttsSecondsUsed: 0 };
  }
}

/** Increment this month's documents_created by one. */
export async function recordDocumentCreated(): Promise<void> {
  try {
    const counter = await getOrCreateCounter();
    await overskill.entities.usage_counter.update(counter.id, {
      documents_created: (Number(counter.documents_created) || 0) + 1,
    });
  } catch (err) {
    console.warn("[usage] documents_created update failed:", err);
  }
}

/** Add TTS seconds used to this month's counter (used by later prompts). */
export async function recordTtsSeconds(seconds: number): Promise<void> {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  try {
    const counter = await getOrCreateCounter();
    await overskill.entities.usage_counter.update(counter.id, {
      tts_seconds_used: (Number(counter.tts_seconds_used) || 0) + Math.round(seconds),
    });
  } catch (err) {
    console.warn("[usage] tts_seconds_used update failed:", err);
  }
}
