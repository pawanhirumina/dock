"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

const EXPIRING_SOON_MS = 1000 * 60 * 60 * 24 * 7;

function timeAgo(value) {
  if (!value) return "—";
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function parseEnvFile(text) {
  const envs = [];
  for (let line of text.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const name = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (name && value) {
      envs.push({
        name: name.toUpperCase(),
        value,
        description: "Imported from .env",
      });
    }
  }
  return envs;
}

function isExpired(date) {
  return Boolean(date) && new Date(date) < new Date();
}

function isExpiringSoon(date) {
  if (!date) return false;
  const time = new Date(date).getTime();
  return time > Date.now() && time - Date.now() < EXPIRING_SOON_MS;
}

function secretStatus(env) {
  if (isExpired(env.expires_at)) {
    return { label: "Expired", variant: "destructive" };
  }
  if (isExpiringSoon(env.expires_at)) {
    return { label: "Expiring", variant: "secondary" };
  }
  return { label: "Active", variant: "outline" };
}

const emptyForm = {
  name: "",
  value: "",
  description: "",
  expires_at: "",
};

export default function EnvVaultPage() {
  const [supabase] = useState(() => createClient());
  const [envs, setEnvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [revealedIds, setRevealedIds] = useState(() => new Set());

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [nameError, setNameError] = useState("");

  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const [parsedEnvs, setParsedEnvs] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [envToDelete, setEnvToDelete] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchEnvs = async () => {
      const { data, error } = await supabase
        .from("env_vaults")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        setLoadError(error.message);
        toast.add({
          type: "error",
          title: "Could not load secrets",
          description: error.message,
        });
      } else {
        setEnvs(data || []);
        setLoadError("");
      }
      setLoading(false);
    };

    fetchEnvs();

    const channel = supabase
      .channel("envs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "env_vaults" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEnvs((prev) =>
              prev.some((env) => env.id === payload.new.id)
                ? prev
                : [payload.new, ...prev],
            );
          }
          if (payload.eventType === "DELETE") {
            setEnvs((prev) =>
              prev.filter((env) => env.id !== payload.old.id),
            );
          }
          if (payload.eventType === "UPDATE") {
            setEnvs((prev) =>
              prev.map((env) =>
                env.id === payload.new.id ? payload.new : env,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return envs;
    return envs.filter(
      (env) =>
        env.name.toLowerCase().includes(query) ||
        env.description?.toLowerCase().includes(query),
    );
  }, [envs, search]);

  const expiringCount = useMemo(
    () => envs.filter((env) => isExpiringSoon(env.expires_at)).length,
    [envs],
  );
  const expiredCount = useMemo(
    () => envs.filter((env) => isExpired(env.expires_at)).length,
    [envs],
  );

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setDragActive(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  };

  const processFile = async (file) => {
    const text = await file.text();
    const parsed = parseEnvFile(text);
    if (parsed.length === 0) {
      toast.add({
        type: "error",
        title: "Nothing to import",
        description: "No valid KEY=VALUE pairs were found in that file.",
      });
      return;
    }
    setParsedEnvs(parsed);
    setShowConfirm(true);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (file) await processFile(file);
    event.target.value = "";
  };

  const closeImport = () => {
    setShowConfirm(false);
    setParsedEnvs([]);
  };

  const confirmImport = async () => {
    setImporting(true);
    const { data, error } = await supabase
      .from("env_vaults")
      .insert(
        parsedEnvs.map((env) => ({
          name: env.name,
          value: env.value,
          description: env.description,
          expires_at: null,
        })),
      )
      .select();

    if (error) {
      toast.add({
        type: "error",
        title: "Import failed",
        description: error.message,
      });
    } else {
      if (data?.length) {
        setEnvs((prev) => {
          const existing = new Set(prev.map((env) => env.id));
          return [...data.filter((env) => !existing.has(env.id)), ...prev];
        });
      }
      toast.add({
        type: "success",
        title: `${parsedEnvs.length} secrets imported`,
        description: "Your vault is up to date.",
      });
      closeImport();
    }
    setImporting(false);
  };

  const handleSave = async () => {
    const name = form.name.trim().toUpperCase();
    if (!name || !form.value) {
      toast.add({
        type: "error",
        title: "Missing fields",
        description: "Name and value are required.",
      });
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(name)) {
      setNameError("Use uppercase letters, numbers, and underscores only.");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("env_vaults")
      .insert({
        name,
        value: form.value,
        description: form.description || null,
        expires_at: form.expires_at
          ? new Date(form.expires_at).toISOString()
          : null,
      })
      .select()
      .single();

    if (error) {
      toast.add({
        type: "error",
        title: "Could not save secret",
        description: error.message,
      });
    } else {
      if (data) {
        setEnvs((prev) =>
          prev.some((env) => env.id === data.id) ? prev : [data, ...prev],
        );
      }
      toast.add({
        type: "success",
        title: "Secret saved",
        description: `${name} was added to your vault.`,
      });
      setForm(emptyForm);
      setNameError("");
      setOpen(false);
    }
    setSaving(false);
  };

  const handleDeleteClick = (env) => {
    setEnvToDelete(env);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!envToDelete) return;
    const { error } = await supabase
      .from("env_vaults")
      .delete()
      .eq("id", envToDelete.id);

    if (error) {
      toast.add({
        type: "error",
        title: "Delete failed",
        description: error.message,
      });
    } else {
      setEnvs((prev) => prev.filter((env) => env.id !== envToDelete.id));
      toast.add({
        type: "success",
        title: "Secret deleted",
        description: `${envToDelete.name} was removed from your vault.`,
      });
    }
    setConfirmOpen(false);
    setEnvToDelete(null);
  };

  const handleCopy = async (env) => {
    try {
      await navigator.clipboard.writeText(env.value);
      setCopiedId(env.id);
      toast.add({
        type: "success",
        title: "Copied to clipboard",
        description: `${env.name} is ready to paste.`,
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.add({
        type: "error",
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
      });
    }
  };

  const toggleReveal = (id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <TooltipProvider>
      <div
        className="relative flex flex-col gap-6"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
            <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-card p-10 text-center shadow-lg">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Upload className="size-6 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold">Drop your .env file</p>
                <p className="text-sm text-muted-foreground">
                  We'll parse the KEY=VALUE pairs and let you review them first.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Env Vault</h1>
            <p className="max-w-prose text-sm text-muted-foreground">
              Keep project secrets in one place. Values stay masked until you
              choose to reveal them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".env,.txt,*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              Import .env
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              Add secret
            </Button>
          </div>
        </div>

        <Alert>
          <ShieldCheck />
          <AlertTitle>Stored in your Supabase project</AlertTitle>
          <AlertDescription>
            Values are only revealed on demand. Drag a <code>.env</code> file
            anywhere on this page to import secrets in bulk.
          </AlertDescription>
        </Alert>

        {loadError && (
          <Alert variant="destructive">
            <ShieldAlert />
            <AlertTitle>Could not load your vault</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium">
                Total secrets
              </CardTitle>
              <KeyRound className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {loading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <span className="text-2xl font-semibold tabular-nums">
                  {envs.length}
                </span>
              )}
              <p className="text-xs text-muted-foreground">
                Across your projects
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium">
                Expiring soon
              </CardTitle>
              <CalendarClock className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {loading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <span className="text-2xl font-semibold tabular-nums">
                  {expiringCount}
                </span>
              )}
              <p className="text-xs text-muted-foreground">
                Within the next 7 days
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <ShieldAlert className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {loading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <span className="text-2xl font-semibold tabular-nums">
                  {expiredCount}
                </span>
              )}
              <p className="text-xs text-muted-foreground">
                Rotate these credentials
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Secrets</CardTitle>
              <CardDescription>
                {search
                  ? `${filtered.length} of ${envs.length} secrets`
                  : `${envs.length} ${envs.length === 1 ? "secret" : "secrets"} in your vault`}
              </CardDescription>
            </div>
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search secrets..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search secrets"
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Secret</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="pr-4">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-9 rounded-lg" />
                          <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="pr-4">
                        <Skeleton className="ml-auto size-8" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <Empty className="border border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <KeyRound />
                    </EmptyMedia>
                    <EmptyTitle>
                      {search ? "No matching secrets" : "No secrets yet"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {search
                        ? `Nothing matches “${search}”. Try a different search.`
                        : "Add a secret manually, or drag and drop a .env file to import them in bulk."}
                    </EmptyDescription>
                  </EmptyHeader>
                  {!search && (
                    <EmptyContent>
                      <Button
                        variant="outline"
                        onClick={() => setOpen(true)}
                      >
                        <Plus data-icon="inline-start" />
                        Add your first secret
                      </Button>
                    </EmptyContent>
                  )}
                </Empty>
              </div>
            ) : (
              <Table>
                <TableCaption className="sr-only">
                  Environment secrets stored in your vault
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Secret</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="pr-4">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((env) => {
                    const revealed = revealedIds.has(env.id);
                    const status = secretStatus(env);

                    return (
                      <TableRow key={env.id}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                              <KeyRound className="size-4" />
                            </div>
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <span className="truncate font-mono text-sm font-medium">
                                {env.name}
                              </span>
                              {env.description && (
                                <span className="max-w-[32ch] truncate text-xs text-muted-foreground">
                                  {env.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="block max-w-[28ch] truncate font-mono text-xs text-muted-foreground">
                            {revealed ? env.value : "••••••••••••"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {env.expires_at
                            ? new Date(env.expires_at).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {timeAgo(env.created_at)}
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={
                                      revealed ? "Hide value" : "Reveal value"
                                    }
                                    onClick={() => toggleReveal(env.id)}
                                  >
                                    {revealed ? <EyeOff /> : <Eye />}
                                  </Button>
                                }
                              />
                              <TooltipContent>
                                {revealed ? "Hide value" : "Reveal value"}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Copy value"
                                    onClick={() => handleCopy(env)}
                                  >
                                    {copiedId === env.id ? <Check /> : <Copy />}
                                  </Button>
                                }
                              />
                              <TooltipContent>Copy value</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Delete secret"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteClick(env)}
                                  >
                                    <Trash2 />
                                  </Button>
                                }
                              />
                              <TooltipContent>Delete secret</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setForm(emptyForm);
              setNameError("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add secret</DialogTitle>
              <DialogDescription>
                Store a new environment variable in your vault.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Field data-invalid={Boolean(nameError)}>
                <FieldLabel htmlFor="secret-name">Name</FieldLabel>
                <Input
                  id="secret-name"
                  placeholder="MY_API_KEY"
                  className="font-mono"
                  autoComplete="off"
                  value={form.name}
                  aria-invalid={Boolean(nameError)}
                  onChange={(event) => {
                    setNameError("");
                    setForm({
                      ...form,
                      name: event.target.value.toUpperCase(),
                    });
                  }}
                />
                {nameError ? (
                  <FieldError>{nameError}</FieldError>
                ) : (
                  <FieldDescription>
                    Uppercase letters, numbers, and underscores.
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="secret-value">Value</FieldLabel>
                <Textarea
                  id="secret-value"
                  placeholder="Paste the secret value"
                  className="min-h-20 font-mono"
                  autoComplete="off"
                  value={form.value}
                  onChange={(event) =>
                    setForm({ ...form, value: event.target.value })
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="secret-description">
                  Description{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  id="secret-description"
                  placeholder="What is this secret used for?"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="secret-expiry">
                  Expiry{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  id="secret-expiry"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(event) =>
                    setForm({ ...form, expires_at: event.target.value })
                  }
                />
                <FieldDescription>
                  Get a warning in the vault when this secret is close to
                  expiring.
                </FieldDescription>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Saving...
                  </>
                ) : (
                  "Save secret"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showConfirm}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) closeImport();
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Import {parsedEnvs.length}{" "}
                {parsedEnvs.length === 1 ? "secret" : "secrets"}
              </DialogTitle>
              <DialogDescription>
                Review the variables parsed from your file, then import them
                into the vault.
              </DialogDescription>
            </DialogHeader>

            <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
              {parsedEnvs.map((env, index) => (
                <div
                  key={`${env.name}-${index}`}
                  className="flex items-center gap-2"
                >
                  <Input
                    aria-label={`Name for secret ${index + 1}`}
                    value={env.name}
                    className="max-w-44 font-mono font-medium"
                    onChange={(event) => {
                      const next = [...parsedEnvs];
                      next[index] = {
                        ...next[index],
                        name: event.target.value.toUpperCase(),
                      };
                      setParsedEnvs(next);
                    }}
                  />
                  <span className="text-muted-foreground">=</span>
                  <Input
                    aria-label={`Value for secret ${index + 1}`}
                    value={env.value}
                    className="flex-1 font-mono text-xs"
                    onChange={(event) => {
                      const next = [...parsedEnvs];
                      next[index] = {
                        ...next[index],
                        value: event.target.value,
                      };
                      setParsedEnvs(next);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${env.name}`}
                    onClick={() =>
                      setParsedEnvs((prev) =>
                        prev.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeImport}>
                Cancel
              </Button>
              <Button
                onClick={confirmImport}
                disabled={importing || parsedEnvs.length === 0}
              >
                {importing ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FileText data-icon="inline-start" />
                    Import {parsedEnvs.length}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete secret?"
          description={`Delete ${envToDelete?.name}? This cannot be undone.`}
          onConfirm={confirmDelete}
          confirmText="Delete"
          loadingText="Deleting..."
          variant="destructive"
        />
      </div>
    </TooltipProvider>
  );
}
