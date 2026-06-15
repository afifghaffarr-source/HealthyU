import { cn } from "@/lib/utils";
import type { ImgHTMLAttributes } from "react";
import { proxiedImg } from "./lazy-image.utils";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  proxy?: boolean;
  w?: number;
  q?: number;
};

export function LazyImage({ className, alt = "", proxy, w, q, src, ...rest }: Props) {
  const finalSrc = proxy && typeof src === "string" ? proxiedImg(src, { w, q }) : src;
  return (
    <img
      {...rest}
      src={finalSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("bg-muted", className)}
    />
  );
}
