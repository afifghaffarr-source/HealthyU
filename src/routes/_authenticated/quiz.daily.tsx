import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getDailyQuiz, answerDailyQuiz, getDailyQuote } from "@/lib/scanBatch7.functions";
import { Brain, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quiz/daily")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const quizFn = useServerFn(getDailyQuiz);
  const ansFn = useServerFn(answerDailyQuiz);
  const quoteFn = useServerFn(getDailyQuote);
  const { data, isLoading } = useQuery({ queryKey: ["daily-quiz"], queryFn: () => quizFn({ data: undefined as any }) });
  const { data: quote } = useQuery({ queryKey: ["daily-quote"], queryFn: () => quoteFn({ data: undefined as any }) });
  const mut = useMutation({
    mutationFn: (i: number) => ansFn({ data: { quizId: data!.quiz.id, answer: i } }),
    onSuccess: (r) => {
      toast.success(r.correct ? `Benar! +${r.coins} coin` : "Salah, coba lagi besok");
      qc.invalidateQueries({ queryKey: ["daily-quiz"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const q = data?.quiz as any;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Kuis Harian" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {quote?.quote && (
          <div className="rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 p-4 border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Sparkles className="size-3" /> Quote Hari Ini</div>
            <p className="text-sm italic">"{quote.quote.quote}"</p>
          </div>
        )}
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        {q && (
          <div className="rounded-2xl bg-card border p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary text-xs uppercase font-semibold"><Brain className="size-4" /> Pertanyaan</div>
            <h3 className="font-bold">{q.question}</h3>
            <div className="space-y-2">
              {(q.options as string[]).map((opt, i) => {
                const answered = q.user_answer !== null;
                const isUser = q.user_answer === i;
                const isCorrect = q.correct_index === i;
                return (
                  <button
                    key={i}
                    disabled={answered || mut.isPending}
                    onClick={() => mut.mutate(i)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border ${
                      answered && isCorrect ? "bg-green-500/10 border-green-500" : isUser ? "bg-red-500/10 border-red-500" : "bg-background"
                    } disabled:opacity-70`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}