/**
 * Profile Insights Page
 *
 * Shows all active and resolved eating patterns for the user.
 * Sprint 15-16: Timeline view + category filter (Option B features).
 */

import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getProfile } from "@/features/profile/lib/profile.functions";
import { useAllPatterns, useDismissPattern } from "@/features/patterns/hooks/usePatternInsights";
import {
  PatternInsightCard,
  PatternInsightCardSkeleton,
  PatternInsightEmpty,
} from "@/features/patterns/components/PatternInsightCard";
import { PatternTimeline } from "@/features/patterns/components/PatternTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, LayoutGrid, GitBranch, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import type { PatternCategory, PatternInsight } from "@/features/patterns/types/pattern";
import { PATTERN_METADATA } from "@/features/patterns/types/pattern";
import { handleQuickAction } from "@/features/patterns/lib/quickActions";

// Indonesian labels for pattern categories — kept here (not in PATTERN_METADATA)
// since labels change per-locale and metadata is UI-agnostic.
const CATEGORY_LABELS: Record<PatternCategory, string> = {
  time: "Waktu Makan",
  emotional: "Emosi",
  social: "Sosial",
  cravings: "Ngidam",
  schedule: "Jadwal",
  location: "Lokasi",
  hunger: "Lapar",
};

const profileQueryOptions = queryOptions({
  queryKey: ["profile"],
  queryFn: () => getProfile(),
});

export const Route = createFileRoute("/_authenticated/profile/insights")({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQueryOptions),
  component: ProfileInsightsPage,
});

function ProfileInsightsPage() {
  const { data: profile } = useQuery(profileQueryOptions);
  const { data, isLoading, refetch, isRefetching } = useAllPatterns(profile?.id);
  const dismissMutation = useDismissPattern();
  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards");
  const [categoryFilter, setCategoryFilter] = useState<PatternCategory | "all">("all");

  // Build category list once from PATTERN_METADATA (only categories present
  // in the user's actual data — no need to render 7 empty options).
  const availableCategories = useMemo<PatternCategory[]>(() => {
    const seen = new Set<PatternCategory>();
    for (const p of [...(data?.active ?? []), ...(data?.resolved ?? [])]) {
      const meta = PATTERN_METADATA[p.pattern_type as keyof typeof PATTERN_METADATA];
      if (meta) seen.add(meta.category);
    }
    return Array.from(seen);
  }, [data]);

  function matchesCategory(p: PatternInsight): boolean {
    if (categoryFilter === "all") return true;
    const meta = PATTERN_METADATA[p.pattern_type as keyof typeof PATTERN_METADATA];
    return meta?.category === categoryFilter;
  }

  const handleDismiss = async (patternId: string) => {
    if (!confirm("Yakin sudah handle pattern ini?")) return;
    await dismissMutation.mutateAsync(patternId);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <a
            href="/profile"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali ke Profile
          </a>
          <h1 className="text-2xl font-bold">Pattern Insights</h1>
        </div>

        <div className="space-y-4">
          <PatternInsightCardSkeleton />
          <PatternInsightCardSkeleton />
        </div>
      </div>
    );
  }

  const activePatterns = (data?.active ?? []).filter(matchesCategory);
  const resolvedPatterns = (data?.resolved ?? []).filter(matchesCategory);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <a
          href="/profile"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Kembali ke Profile
        </a>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Pattern Insights</h1>
            <p className="text-sm text-gray-600 mt-1">
              Pola makan yang terdeteksi dari aktivitasmu
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {availableCategories.length > 0 && (
              <Select
                value={categoryFilter}
                onValueChange={(v: string) => setCategoryFilter(v as PatternCategory | "all")}
              >
                <SelectTrigger className="h-9 w-[160px] text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {viewMode === "cards" ? (
                    <>
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Cards
                    </>
                  ) : (
                    <>
                      <GitBranch className="h-4 w-4 mr-2" />
                      Timeline
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setViewMode("cards")}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setViewMode("timeline")}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Timeline
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "resolved")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="active">Active ({activePatterns.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedPatterns.length})</TabsTrigger>
        </TabsList>

        {/* Active Patterns */}
        <TabsContent value="active" className="space-y-4">
          {activePatterns.length === 0 ? (
            categoryFilter !== "all" ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                Tidak ada pattern aktif di kategori "
                {CATEGORY_LABELS[categoryFilter as PatternCategory]}"
              </div>
            ) : (
              <PatternInsightEmpty />
            )
          ) : viewMode === "cards" ? (
            activePatterns.map((pattern) => (
              <PatternInsightCard
                key={pattern.id}
                pattern={pattern}
                onDismiss={handleDismiss}
                onQuickAction={handleQuickAction}
              />
            ))
          ) : (
            <PatternTimeline patterns={activePatterns} onQuickAction={handleQuickAction} />
          )}
        </TabsContent>

        {/* Resolved Patterns */}
        <TabsContent value="resolved" className="space-y-4">
          {resolvedPatterns.length === 0 ? (
            categoryFilter !== "all" ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                Tidak ada pattern resolved di kategori "
                {CATEGORY_LABELS[categoryFilter as PatternCategory]}"
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Belum ada pattern yang resolved</p>
              </div>
            )
          ) : viewMode === "cards" ? (
            <div className="space-y-4">
              {resolvedPatterns.map((pattern) => (
                <div key={pattern.id} className="relative">
                  {/* Resolved badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      ✓ Resolved
                    </span>
                  </div>
                  <PatternInsightCard
                    pattern={pattern}
                    onDismiss={undefined} // Can't dismiss resolved patterns
                  />
                </div>
              ))}
            </div>
          ) : (
            <PatternTimeline patterns={resolvedPatterns} onQuickAction={handleQuickAction} />
          )}
        </TabsContent>
      </Tabs>

      {/* Info footer */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
        <p className="font-medium mb-1">💡 Tentang Pattern Insights</p>
        <p className="text-xs text-gray-600">
          Sistem ini menganalisis meal logs kamu setiap hari untuk mendeteksi pola yang bisa
          menghambat progress. Pattern akan otomatis resolved jika kamu berhasil memperbaikinya 70%+
          dalam 14 hari.
        </p>
      </div>
    </div>
  );
}
