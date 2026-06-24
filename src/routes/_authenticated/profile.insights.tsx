/**
 * Profile Insights Page
 *
 * Shows all active and resolved eating patterns for the user
 * Sprint 10b - Pattern Detection AI
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";
import { handleQuickAction } from "@/features/patterns/lib/quickActions";

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

  const activePatterns = data?.active || [];
  const resolvedPatterns = data?.resolved || [];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pattern Insights</h1>
            <p className="text-sm text-gray-600 mt-1">
              Pola makan yang terdeteksi dari aktivitasmu
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
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
            <PatternInsightEmpty />
          ) : (
            activePatterns.map((pattern) => (
              <PatternInsightCard
                key={pattern.id}
                pattern={pattern}
                onDismiss={handleDismiss}
                onQuickAction={handleQuickAction}
              />
            ))
          )}
        </TabsContent>

        {/* Resolved Patterns */}
        <TabsContent value="resolved" className="space-y-4">
          {resolvedPatterns.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Belum ada pattern yang resolved</p>
            </div>
          ) : (
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
