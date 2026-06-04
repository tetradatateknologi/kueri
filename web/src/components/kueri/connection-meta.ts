import type { ConnectionDriver } from "@/lib/api/types";

export const DRIVER_META: Record<
  ConnectionDriver,
  { label: string; defaultPort: number; hint: string; icon: string }
> = {
  postgres: {
    label: "PostgreSQL",
    defaultPort: 5432,
    hint: "Relational · ACID · JSON",
    icon: "/db/postgresql.png",
  },
  mysql: {
    label: "MySQL",
    defaultPort: 3306,
    hint: "Relational · widely deployed",
    icon: "/db/mysql.png",
  },
};

export type ConnectionEnvironment = "development" | "staging" | "production";

export const ENV_META: Record<
  ConnectionEnvironment,
  { label: string; dot: string; ring: string; sslDefault: string }
> = {
  development: {
    label: "Development",
    dot: "bg-env-dev",
    ring: "ring-env-dev/40",
    sslDefault: "disable",
  },
  staging: {
    label: "Staging",
    dot: "bg-env-staging",
    ring: "ring-env-staging/40",
    sslDefault: "require",
  },
  production: {
    label: "Production",
    dot: "bg-env-prod",
    ring: "ring-env-prod/40",
    sslDefault: "require",
  },
};

export function envLabel(environment: string): string {
  const key = environment as ConnectionEnvironment;
  return ENV_META[key]?.label ?? environment;
}
