import { AlertCircle } from "lucide-react";

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-1 flex items-center gap-1 text-[11px] font-medium text-destructive"
    >
      <AlertCircle className="size-3" />
      {message}
    </p>
  );
}
