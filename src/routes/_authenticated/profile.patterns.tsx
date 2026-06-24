/**
 * Pattern Settings Page
 * Sprint 10c Phase 1 - Custom Thresholds UI
 */

import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePatternPreferences } from "@/features/patterns/hooks/usePatternPreferences";
import type { PatternSensitivity } from "@/features/patterns/types/preferences";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/features/profile/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile/patterns")({
  component: PatternSettingsPage,
});

function PatternSettingsPage() {
  const getProfileFn = useServerFn(getProfile);
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfileFn(),
  });

  const userId = profile?.id;
  const { preferences, updateSensitivity, isLoading, isUpdating } = usePatternPreferences(userId);

  const handleSensitivityChange = (value: string) => {
    updateSensitivity(value as PatternSensitivity);
  };

  if (!userId) {
    return (
      <div className="container max-w-2xl py-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pattern Detection Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure how sensitive pattern detection should be
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detection Sensitivity</CardTitle>
          <CardDescription>
            Choose how easily patterns are detected in your eating habits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <RadioGroup
              value={preferences?.sensitivity || "medium"}
              onValueChange={handleSensitivityChange}
              disabled={isUpdating}
              className="space-y-4"
            >
              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="low" id="low" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="low" className="text-base font-medium cursor-pointer">
                    Low Sensitivity
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Only detect obvious patterns (3+ occurrences, high thresholds). Best for casual
                    tracking.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="medium" id="medium" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="medium" className="text-base font-medium cursor-pointer">
                    Medium Sensitivity (Default)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Balanced detection. Catches most patterns without false positives.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="high" id="high" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="high" className="text-base font-medium cursor-pointer">
                    High Sensitivity
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Detect subtle patterns early (2 occurrences, lower thresholds). For power users.
                  </p>
                </div>
              </div>
            </RadioGroup>
          )}

          {isUpdating && <p className="text-sm text-muted-foreground animate-pulse">Saving...</p>}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Low:</strong> Requires more occurrences and higher values to flag a pattern
          </p>
          <p>
            • <strong>Medium:</strong> Standard detection (e.g., 3 skip breakfasts = pattern)
          </p>
          <p>
            • <strong>High:</strong> Catches patterns earlier with fewer occurrences
          </p>
          <p className="mt-4">
            Pattern detection runs automatically after you log 3+ meals. Your next detection will
            use the new sensitivity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
