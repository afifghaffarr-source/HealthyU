import { cn } from "@/lib/utils";
import type { ImgHTMLAttributes } from "react";

export function LazyImage({ className, alt = "", ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...rest}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("bg-muted", className)}
    />
  );
}