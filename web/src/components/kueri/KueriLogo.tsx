import { useState } from "react";
import { Database } from "lucide-react";

import { KUERI_LOGO_SRC } from "@/lib/logo";
import { cn } from "@/lib/utils";

export type KueriLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<KueriLogoSize, { box: string; icon: string; wordmark: string }> = {
  xs: { box: "size-5 rounded", icon: "size-3", wordmark: "text-xs" },
  sm: { box: "size-6 rounded-md", icon: "size-3.5", wordmark: "text-sm" },
  md: { box: "size-8 rounded-md", icon: "size-4", wordmark: "text-sm" },
  lg: { box: "size-12 rounded-lg", icon: "size-6", wordmark: "text-base" },
  xl: { box: "size-20 rounded-xl", icon: "size-10", wordmark: "text-xl" },
};

export type KueriLogoProps = {
  size?: KueriLogoSize;
  showWordmark?: boolean;
  src?: string;
  alt?: string;
  className?: string;
  wordmarkClassName?: string;
};

export function KueriLogo({
  size = "md",
  showWordmark = true,
  src = KUERI_LOGO_SRC,
  alt = "Kueri",
  className,
  wordmarkClassName,
}: KueriLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const useImage = Boolean(src) && !imgFailed;
  const sizing = sizeClasses[size];

  return (
    <div className={cn("inline-flex items-center gap-2.5 opacity-90", className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden flex items-center justify-center",
          sizing.box,
          !useImage && "bg-gradient-to-br from-electric to-neon shadow-[0_0_24px_-4px] shadow-electric/40",
        )}
      >
        {useImage ? (
          <img
            src={src}
            alt={alt}
            className="size-full object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Database className={cn(sizing.icon, "text-background")} aria-hidden />
        )}
      </div>
      {showWordmark ? (
        <span className={cn("font-mono tracking-tight text-foreground", sizing.wordmark, wordmarkClassName)}>
          kueri<span className="text-electric">.dev</span>
        </span>
      ) : null}
    </div>
  );
}
