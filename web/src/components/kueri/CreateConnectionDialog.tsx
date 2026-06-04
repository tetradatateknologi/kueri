import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Eye, EyeOff, Loader2, XCircle } from "lucide-react";

import {
  DRIVER_META,
  ENV_META,
  envLabel,
  type ConnectionEnvironment,
} from "@/components/kueri/connection-meta";
import { DbDriverIcon } from "@/components/kueri/DbDriverIcon";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/http";
import type { Connection, ConnectionDriver, ConnectionInput } from "@/lib/api/types";
import { createConnection, testConnection, updateConnection } from "@/lib/api/workspaces";
import { showSuccess, showValidationError } from "@/lib/toasts";
import { cn } from "@/lib/utils";

type ConnectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number;
  workspaceName: string;
  existingConnections?: Connection[];
  mode?: "create" | "edit";
  connection?: Connection;
  onUpdated?: (conn: Connection) => void;
};

const sharedDefaults = {
  environment: "development" as ConnectionEnvironment,
  host: "localhost",
  database_name: "kueri",
  username: "kueri",
  password: "kueri_secret",
  ssl_mode: "disable",
} as const;

const defaultsByDriver: Record<ConnectionDriver, ConnectionInput> = {
  postgres: {
    ...sharedDefaults,
    name: ENV_META.development.label,
    driver: "postgres",
    port: 5432,
  },
  mysql: {
    ...sharedDefaults,
    name: ENV_META.development.label,
    driver: "mysql",
    port: 3306,
  },
};

type TestStatus = { kind: "success"; message: string } | { kind: "error"; message: string };

function isKnownEnvironment(value: string): value is ConnectionEnvironment {
  return value in ENV_META;
}

function isCustomConnectionName(conn: Connection): boolean {
  const env = conn.environment as ConnectionEnvironment;
  if (!(env in ENV_META)) return true;
  return conn.name !== ENV_META[env].label;
}

function connectionToInitialState(conn: Connection) {
  const env = isKnownEnvironment(conn.environment) ? conn.environment : "development";
  const driver: ConnectionDriver = conn.driver === "mysql" ? "mysql" : "postgres";
  const customName = isCustomConnectionName(conn);
  return {
    form: {
      name: conn.name,
      environment: env,
      driver,
      host: conn.host,
      port: conn.port,
      database_name: conn.database_name,
      username: conn.username,
      password: "",
      ssl_mode: conn.ssl_mode || ENV_META[env].sslDefault,
    } satisfies ConnectionInput,
    customName,
    customNameValue: customName ? conn.name : "",
  };
}

export function CreateConnectionDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  existingConnections = [],
  mode = "create",
  connection,
  onUpdated,
}: ConnectionDialogProps) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState<ConnectionInput>(defaultsByDriver.postgres);
  const [customName, setCustomName] = useState(false);
  const [customNameValue, setCustomNameValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus | null>(null);
  const queryClient = useQueryClient();

  const resetForm = () => {
    setForm(defaultsByDriver.postgres);
    setCustomName(false);
    setCustomNameValue("");
    setShowPassword(false);
    setAdvancedOpen(false);
    setTestStatus(null);
  };

  useEffect(() => {
    if (!open) return;
    if (isEdit && connection) {
      const initial = connectionToInitialState(connection);
      setForm(initial.form);
      setCustomName(initial.customName);
      setCustomNameValue(initial.customNameValue);
      setShowPassword(false);
      setAdvancedOpen(false);
      setTestStatus(null);
      return;
    }
    resetForm();
  }, [open, isEdit, connection]);

  const patch = (partial: Partial<ConnectionInput>) => {
    setTestStatus(null);
    setForm((f) => ({ ...f, ...partial }));
  };

  const resolvedName = customName ? customNameValue.trim() : envLabel(form.environment);

  const duplicateWarning = useMemo(() => {
    if (!resolvedName) return null;
    const clash = existingConnections.find(
      (c) =>
        c.id !== connection?.id &&
        c.name.toLowerCase() === resolvedName.toLowerCase() &&
        c.environment.toLowerCase() === form.environment.toLowerCase(),
    );
    if (!clash) return null;
    return `A connection named "${clash.name}" already exists in ${envLabel(form.environment)}.`;
  }, [connection?.id, existingConnections, form.environment, resolvedName]);

  const setDriver = (driver: ConnectionDriver) => {
    setTestStatus(null);
    setForm((f) => ({
      ...defaultsByDriver[driver],
      name: customName ? customNameValue : envLabel(f.environment),
      environment: f.environment,
      host: f.host,
      database_name: f.database_name,
      username: f.username,
      password: f.password,
      ssl_mode: f.ssl_mode,
      driver,
      port: defaultsByDriver[driver].port,
    }));
  };

  const setEnvironment = (environment: ConnectionEnvironment) => {
    setTestStatus(null);
    const meta = ENV_META[environment];
    patch({
      environment,
      name: customName ? form.name : meta.label,
      ssl_mode: meta.sslDefault,
    });
  };

  const body = (): ConnectionInput => ({
    ...form,
    name: resolvedName,
    host: form.host.trim(),
    database_name: form.database_name.trim(),
    username: form.username.trim(),
    driver: form.driver,
  });

  const testMutation = useMutation({
    mutationFn: () => testConnection(workspaceId, body()),
    onSuccess: () => {
      setTestStatus({ kind: "success", message: "Connection successful" });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Connection test failed";
      setTestStatus({ kind: "error", message });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = body();
      if (isEdit && connection) {
        return updateConnection(workspaceId, connection.id, payload);
      }
      return createConnection(workspaceId, payload);
    },
    onSuccess: async (conn) => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      if (isEdit) {
        showSuccess(`Connection "${conn.name}" updated`);
        onUpdated?.(conn);
      } else {
        showSuccess(`Connection "${conn.name}" created`);
      }
      onOpenChange(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : isEdit
              ? "Failed to update connection"
              : "Failed to create connection";
      showValidationError(message);
    },
  });

  const validate = () => {
    if (!resolvedName || !form.host.trim() || !form.database_name.trim()) {
      showValidationError("Display name, host, and database are required");
      return false;
    }
    if (form.port <= 0) {
      showValidationError("Port must be greater than zero");
      return false;
    }
    if (duplicateWarning) {
      showValidationError(duplicateWarning);
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) saveMutation.mutate();
  };

  const busy = testMutation.isPending || saveMutation.isPending;
  const driverLabel = DRIVER_META[form.driver].label;
  const currentEnv = isKnownEnvironment(form.environment) ? form.environment : "development";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit connection" : "New connection"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update" : "Add"} a {driverLabel} connection in{" "}
              <span className="font-mono text-foreground">{workspaceName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Database type</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(Object.keys(DRIVER_META) as ConnectionDriver[]).map((driver) => {
                  const meta = DRIVER_META[driver];
                  const selected = form.driver === driver;
                  return (
                    <button
                      key={driver}
                      type="button"
                      disabled={isEdit}
                      onClick={() => setDriver(driver)}
                      className={cn(
                        isEdit && "cursor-default opacity-90",
                        "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                        "hover:bg-surface-1 hover:border-border/80",
                        selected
                          ? "border-electric/50 bg-electric/5 ring-1 ring-electric/30"
                          : "border-border bg-surface-1/50",
                      )}
                    >
                      <DbDriverIcon driver={driver} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{meta.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          port {meta.defaultPort}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 mt-1">{meta.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Environment</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(Object.keys(ENV_META) as ConnectionEnvironment[]).map((env) => {
                  const meta = ENV_META[env];
                  const selected = currentEnv === env;
                  return (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setEnvironment(env)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs transition-colors",
                        "hover:bg-surface-1",
                        selected
                          ? cn("border-border bg-surface-1 ring-1", meta.ring)
                          : "border-border/70 bg-surface-1/30",
                      )}
                    >
                      <span className={cn("size-2.5 rounded-full", meta.dot)} />
                      <span className="font-medium">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
              {!customName && (
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Display name: <span className="font-mono text-foreground">{resolvedName}</span>
                </p>
              )}
            </div>

            <div>
              {!customName ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomName(true);
                    setCustomNameValue(resolvedName);
                    patch({ name: resolvedName });
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                >
                  Use a custom display name
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">Custom display name</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomName(false);
                        setCustomNameValue("");
                        patch({ name: envLabel(form.environment) });
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Use environment name
                    </button>
                  </div>
                  <Input
                    className="mt-1"
                    value={customNameValue}
                    onChange={(e) => {
                      setTestStatus(null);
                      setCustomNameValue(e.target.value);
                      patch({ name: e.target.value });
                    }}
                    placeholder="e.g. Analytics replica"
                    autoFocus
                  />
                </div>
              )}
              {duplicateWarning && (
                <p className="mt-1.5 text-[11px] text-destructive">{duplicateWarning}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Host</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  value={form.host}
                  onChange={(e) => patch({ host: e.target.value })}
                  placeholder="localhost"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Port</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  type="number"
                  value={form.port}
                  onChange={(e) => patch({ port: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Database</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={form.database_name}
                onChange={(e) => patch({ database_name: e.target.value })}
                placeholder="my_database"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Username</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  value={form.username}
                  onChange={(e) => patch({ username: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Password</Label>
                <div className="relative mt-1">
                  <Input
                    className="font-mono text-sm pr-9"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => patch({ password: e.target.value })}
                    placeholder={isEdit ? "Unchanged" : undefined}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
                {isEdit && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Leave blank to keep the current password.
                  </p>
                )}
              </div>
            </div>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown
                    className={cn("size-3.5 transition-transform", advancedOpen && "rotate-180")}
                  />
                  Advanced options
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Label className="text-xs text-muted-foreground">SSL mode</Label>
                <Select value={form.ssl_mode} onValueChange={(v) => patch({ ssl_mode: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disable">disable</SelectItem>
                    <SelectItem value="require">require</SelectItem>
                    <SelectItem value="verify-full">verify-full</SelectItem>
                  </SelectContent>
                </Select>
                {currentEnv === "production" && form.ssl_mode === "disable" && (
                  <p className="mt-1.5 text-[10px] text-env-prod">
                    Production connections should use SSL.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>

            {testStatus && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                  testStatus.kind === "success"
                    ? "border-env-dev/40 bg-env-dev/10 text-env-dev"
                    : "border-destructive/40 bg-destructive/10 text-destructive",
                )}
              >
                {testStatus.kind === "success" ? (
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="size-3.5 shrink-0 mt-0.5" />
                )}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (validate()) testMutation.mutate();
              }}
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Testing…
                </>
              ) : (
                "Test connection"
              )}
            </Button>
            <Button type="submit" size="sm" disabled={busy || !!duplicateWarning}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
