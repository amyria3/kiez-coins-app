// Abrufe Deiner Daten durchs Team (Migrationen 20261027000100_chat_access_log.sql, 20261027000200_my_data_access.sql).
import { supabase } from '../lib/supabase';

export type DataAccess = {
  createdAt: string;
  /** 'person': gezielt von jemandem aus dem Team, 'automatisch': Ablauf der Datenbank */
  kind: 'person' | 'automatisch';
  actor: string;
  reason: string;
  targeted: boolean;
  contentRead: boolean;
};

type Row = {
  created_at: string;
  kind: 'person' | 'automatisch';
  actor: string;
  reason: string;
  targeted: boolean;
  content_read: boolean;
};

/** Neueste zuerst */
export async function loadMyDataAccess(): Promise<DataAccess[]> {
  const { data, error } = await supabase.rpc('meine_datenabrufe');
  if (error) throw error;
  return ((data ?? []) as Row[])
    .map((r) => ({
      createdAt: r.created_at,
      kind: r.kind,
      actor: r.actor,
      reason: r.reason,
      targeted: r.targeted,
      contentRead: r.content_read,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
