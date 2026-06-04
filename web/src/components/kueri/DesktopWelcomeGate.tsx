import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { DesktopWelcomeScreen } from "@/components/kueri/DesktopWelcomeScreen";
import { isDesktopBuild } from "@/lib/app-meta";
import { fetchHealth } from "@/lib/api/health";
import { fetchVersion } from "@/lib/api/version";
import { healthQueryKey } from "@/lib/api/queries";

const MIN_SPLASH_MS = 1200;
const EXIT_MS = 450;

type DesktopWelcomeGateProps = {
  children: ReactNode;
};

export function DesktopWelcomeGate({ children }: DesktopWelcomeGateProps) {
  const versionQuery = useQuery({
    queryKey: ["version"],
    queryFn: fetchVersion,
    retry: 8,
    retryDelay: (attempt) => Math.min(500 * (attempt + 1), 3000),
    staleTime: Infinity,
    enabled: isDesktopBuild,
  });

  const healthQuery = useQuery({
    queryKey: healthQueryKey,
    queryFn: fetchHealth,
    retry: 20,
    retryDelay: (attempt) => Math.min(400 * (attempt + 1), 2500),
    refetchInterval: (query) => (query.state.status === "success" ? false : 800),
    enabled: isDesktopBuild || versionQuery.isSuccess,
  });
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isDesktop =
    isDesktopBuild || versionQuery.data?.mode === "desktop";

  useEffect(() => {
    if (!isDesktop) return;
    const timer = window.setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, [isDesktop]);

  const apiReady = healthQuery.isSuccess;
  const canContinue = apiReady && minTimeElapsed;

  const handleContinue = () => {
    setExiting(true);
    window.setTimeout(() => setDismissed(true), EXIT_MS);
  };

  if (!isDesktop || dismissed) {
    return children;
  }

  return (
    <>
      {children}
      <DesktopWelcomeScreen
        visible={!dismissed}
        exiting={exiting}
        apiReady={apiReady}
        canContinue={canContinue}
        onContinue={handleContinue}
      />
    </>
  );
}
