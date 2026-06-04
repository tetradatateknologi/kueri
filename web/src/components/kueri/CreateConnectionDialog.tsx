import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
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
import type { ConnectionDriver, ConnectionInput } from "@/lib/api/types";
import { createConnection, testConnection } from "@/lib/api/workspaces";
import { showSuccess, showValidationError } from "@/lib/toasts";

type CreateConnectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number;
  workspaceName: string;
};

const sharedDefaults = {
  name: "Development",
  environment: "development",
  host: "localhost",
  database_name: "kueri",
  username: "kueri",
  password: "kueri_secret",
  ssl_mode: "disable",
} as const;

const defaultsByDriver: Record<ConnectionDriver, ConnectionInput> = {
  postgres: {
    ...sharedDefaults,
    driver: "postgres",
    port: 5433,
  },
  mysql: {
    ...sharedDefaults,
    driver: "mysql",
    port: 3306,
  },
};

export function CreateConnectionDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
}: CreateConnectionDialogProps) {
  const [form, setForm] = useState<ConnectionInput>(defaultsByDriver.postgres);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setForm(defaultsByDriver.postgres);
  }, [open]);

  const patch = (partial: Partial<ConnectionInput>) => setForm((f) => ({ ...f, ...partial }));

  const setDriver = (driver: ConnectionDriver) => {
    setForm((f) => ({
      ...defaultsByDriver[driver],
      name: f.name,
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

  const body = (): ConnectionInput => ({
    ...form,
    name: form.name.trim(),
    host: form.host.trim(),
    database_name: form.database_name.trim(),
    username: form.username.trim(),
    driver: form.driver,
  });

  const testMutation = useMutation({
    mutationFn: () => testConnection(workspaceId, body()),
    onSuccess: () => showSuccess("Connection successful"),
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Connection test failed";
      showValidationError(message);
    },
  });

  const createMutation = useMutation({
    mutationFn: () => createConnection(workspaceId, body()),
    onSuccess: async (conn) => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      showSuccess(`Connection "${conn.name}" created`);
      onOpenChange(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to create connection";
      showValidationError(message);
    },
  });

  const validate = () => {
    if (!form.name.trim() || !form.host.trim() || !form.database_name.trim()) {
      showValidationError("Name, host, and database are required");
      return false;
    }
    if (form.port <= 0) {
      showValidationError("Port must be greater than zero");
      return false;
    }
    return true;
  };

  const busy = testMutation.isPending || createMutation.isPending;
  const driverLabel = form.driver === "mysql" ? "MySQL" : "PostgreSQL";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New connection</DialogTitle>
          <DialogDescription>
            Add a {driverLabel} connection to <span className="font-mono text-foreground">{workspaceName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Database type</Label>
            <Select value={form.driver} onValueChange={(v) => setDriver(v as ConnectionDriver)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postgres">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Display name</Label>
            <Input className="mt-1" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Environment</Label>
            <Select value={form.environment} onValueChange={(v) => patch({ environment: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Host</Label>
              <Input className="mt-1 font-mono text-sm" value={form.host} onChange={(e) => patch({ host: e.target.value })} />
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
              <Input
                className="mt-1 font-mono text-sm"
                type="password"
                value={form.password}
                onChange={(e) => patch({ password: e.target.value })}
              />
            </div>
          </div>
          <div>
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
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
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
            {testMutation.isPending ? "Testing…" : "Test connection"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (validate()) createMutation.mutate();
            }}
          >
            {createMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
