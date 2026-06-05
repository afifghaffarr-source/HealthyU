import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  GROUP_BONUS_AGGREGATE_MS,
  GROUP_BONUS_BADGE_TTL_MS,
  GROUP_BONUS_BADGE_TICK_MS,
} from "@/lib/constants";

export function useGroupBonusClaims() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const claimsTsRef = useRef<Record<string, number>>({});
  const [newClaims, setNewClaims] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.sessionStorage.getItem("dashboard:newClaims");
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, { count: number; ts: number }>;
      const now = Date.now();
      const out: Record<string, number> = {};
      for (const [gid, entry] of Object.entries(parsed)) {
        if (
          entry &&
          typeof entry.count === "number" &&
          typeof entry.ts === "number" &&
          now - entry.ts < GROUP_BONUS_BADGE_TTL_MS
        ) {
          out[gid] = entry.count;
          claimsTsRef.current[gid] = entry.ts;
        }
      }
      return out;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const keys = Object.keys(newClaims);
    if (keys.length === 0) {
      window.sessionStorage.removeItem("dashboard:newClaims");
      claimsTsRef.current = {};
      return;
    }
    const payload: Record<string, { count: number; ts: number }> = {};
    for (const k of keys) {
      payload[k] = { count: newClaims[k], ts: claimsTsRef.current[k] ?? Date.now() };
    }
    window.sessionStorage.setItem("dashboard:newClaims", JSON.stringify(payload));
  }, [newClaims]);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (Object.keys(newClaims).length === 0) return;
    const id = window.setInterval(() => setNowTick(Date.now()), GROUP_BONUS_BADGE_TICK_MS);
    return () => window.clearInterval(id);
  }, [newClaims]);

  useEffect(() => {
    const buffer = new Map<string, { groupName: string; names: Set<string> }>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      flushTimer = null;
      for (const [groupId, { groupName, names }] of buffer.entries()) {
        const action = {
          label: "Lihat",
          onClick: () => navigate({ to: "/challenges", search: { group: groupId } }),
        };
        if (names.size === 1) {
          const [only] = Array.from(names);
          toast.success(`🎉 ${only} klaim bonus di ${groupName}`, { action });
        } else if (names.size > 1) {
          toast.success(`🎉 ${names.size} anggota klaim bonus di ${groupName}`, { action });
        }
      }
      buffer.clear();
    };
    const ch = supabase
      .channel("dashboard-group-summary")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_challenge_bonuses" },
        async (payload) => {
          const row = payload.new as { user_id?: string; group_id?: string } | null;
          if (row?.user_id && row?.group_id) {
            const gid = row.group_id;
            claimsTsRef.current[gid] = Date.now();
            setNewClaims((cur) => ({ ...cur, [gid]: (cur[gid] ?? 0) + 1 }));
            setTimeout(() => {
              setNewClaims((cur) => {
                if (!cur[gid]) return cur;
                const copy = { ...cur };
                delete copy[gid];
                return copy;
              });
            }, GROUP_BONUS_BADGE_TTL_MS);
            try {
              const [{ data: prof }, { data: grp }] = await Promise.all([
                supabase.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle(),
                supabase.from("friend_groups").select("name").eq("id", row.group_id).maybeSingle(),
              ]);
              const name = prof?.full_name ?? "Seseorang";
              const groupName = grp?.name ?? "grup";
              const entry = buffer.get(gid) ?? { groupName, names: new Set<string>() };
              entry.names.add(name);
              entry.groupName = groupName;
              buffer.set(gid, entry);
              if (flushTimer) clearTimeout(flushTimer);
              flushTimer = setTimeout(flush, GROUP_BONUS_AGGREGATE_MS);
            } catch {
              /* ignore */
            }
          }
          qc.invalidateQueries({ queryKey: ["group-challenge-summary"] });
          qc.invalidateQueries({ queryKey: ["unlinked-joined-challenges"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "coin_redemptions" }, () => {
        qc.invalidateQueries({ queryKey: ["group-challenge-summary"] });
        qc.invalidateQueries({ queryKey: ["unlinked-joined-challenges"] });
      })
      .subscribe();
    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      supabase.removeChannel(ch);
    };
  }, [qc, navigate]);

  return { newClaims, setNewClaims, claimsTsRef, nowTick };
}