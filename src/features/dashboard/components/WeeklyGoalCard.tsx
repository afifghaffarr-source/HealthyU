import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Target, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getCurrentWeeklyGoal,
  setWeeklyGoal,
  toggleWeeklyGoalDone,
} from "@/features/wellness/lib/wellness.functions";
import { cn } from "@/lib/utils";

export function WeeklyGoalCard() {
  const qc = useQueryClient();
  const fetchGoal = useServerFn(getCurrentWeeklyGoal);
  const saveGoal = useServerFn(setWeeklyGoal);
  const toggleDone = useServerFn(toggleWeeklyGoalDone);

  const { data } = useQuery({
    queryKey: ["weekly-goal"],
    queryFn: () => fetchGoal(),
    staleTime: 60_000,
  });

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const saveMut = useMutation({
    mutationFn: (goal_text: string) => saveGoal({ data: { goal_text } }),
    onSuccess: () => {
      toast.success("Goal mingguan tersimpan");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["weekly-goal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (vars: { id: string; done: boolean }) => toggleDone({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weekly-goal"] }),
  });

  const goal = data?.goal ?? null;
  const done = !!goal?.completed_at;

  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm animate-fade-up">
      <header className="flex items-center gap-2 mb-3">
        <div className="size-10 rounded-2xl bg-emerald-100 grid place-items-center">
          <Target className="size-5 text-emerald-700" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm">Goal minggu ini</h3>
          <p className="text-xs text-muted-foreground">Satu komitmen kecil. Cukup.</p>
        </div>
      </header>

      {editing || !goal ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (!t) return;
            saveMut.mutate(t);
          }}
          className="space-y-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            placeholder="Contoh: minum 8 gelas air tiap hari"
            maxLength={200}
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saveMut.isPending || !text.trim()}>
              Simpan
            </Button>
            {goal ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Batal
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label={done ? "Tandai belum selesai" : "Tandai selesai"}
            onClick={() => toggleMut.mutate({ id: goal.id, done: !done })}
            className={cn(
              "mt-0.5 size-6 rounded-full border-2 grid place-items-center transition-colors flex-shrink-0",
              done
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-border hover:border-emerald-400",
            )}
          >
            {done ? <Check className="size-3.5" /> : null}
          </button>
          <p
            className={cn(
              "flex-1 text-sm leading-snug",
              done && "line-through text-muted-foreground",
            )}
          >
            {goal.goal_text}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Ubah goal"
            onClick={() => {
              setText(goal.goal_text);
              setEditing(true);
            }}
          >
            <Pencil className="size-4" />
          </Button>
        </div>
      )}
    </section>
  );
}
