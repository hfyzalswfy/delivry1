// @deprecated Single-channel subscriptions are created inline per-file.
// This hook is not imported anywhere and will be removed in a future cleanup.
// All realtime subscriptions use the pattern:
//   supabase.channel(name).on(...).on(...).subscribe()
// with cleanup in effect returns.
//
// To re-enable if needed, uncomment and ensure proper RealtimeChannel typing.
/*
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

type ChannelEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type RealtimeCallback = (payload: any) => void;

interface ChannelConfig {
  table: string;
  event?: ChannelEvent;
  filter?: string;
  schema?: string;
}

export function useRealtimeChannel(
  channelName: string,
  config: ChannelConfig,
  callback: RealtimeCallback,
  deps: any[] = [],
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const ch = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: config.event ?? '*',
          schema: config.schema ?? 'public',
          table: config.table,
          filter: config.filter,
        },
        (payload) => callback(payload),
      )
      .subscribe();

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [channelName, config.table, config.event, config.filter, ...deps]);

  return { channelRef };
}
*/
