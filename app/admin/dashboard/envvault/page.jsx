"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  KeyRound,
  Clock,
  Calendar,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Upload,
  FileText,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/confirm-dialog";

function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function parseEnvFile(text) {
  const envs = [];
  for (let line of text.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let name = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    if (name && value)
      envs.push({
        name: name.toUpperCase(),
        value,
        description: "Imported from .env",
      });
  }
  return envs;
}

export default function EnvVaultPage() {
  const supabase = createClient();
  const [envs, setEnvs] = useState([]);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    value: "",
    description: "",
    expires_at: "",
  });
  const [dragActive, setDragActive] = useState(false);
  const [parsedEnvs, setParsedEnvs] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // ConfirmDialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [envToDelete, setEnvToDelete] = useState(null);

  useEffect(() => {
    const fetchEnvs = async () => {
      const { data } = await supabase
        .from("env_vaults")
        .select("*")
        .order("created_at", { ascending: false });
      setEnvs(data || []);
    };
    fetchEnvs();
    const channel = supabase
      .channel("envs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "env_vaults" },
        (payload) => {
          if (payload.eventType === "INSERT")
            setEnvs((prev) => [payload.new, ...prev]);
          if (payload.eventType === "DELETE")
            setEnvs((prev) => prev.filter((e) => e.id !== payload.old.id));
          if (payload.eventType === "UPDATE")
            setEnvs((prev) =>
              prev.map((e) => (e.id === payload.new.id ? payload.new : e)),
            );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };
  const processFile = async (file) => {
    const text = await file.text();
    const parsed = parseEnvFile(text);
    if (parsed.length === 0) return toast.error("No valid KEY=VALUE found");
    setParsedEnvs(parsed);
    setShowConfirm(true);
  };
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = "";
  };
  const confirmImport = async () => {
    setImporting(true);
    const { error } = await supabase
      .from("env_vaults")
      .insert(
        parsedEnvs.map((p) => ({
          name: p.name,
          value: p.value,
          description: p.description,
          expires_at: null,
        })),
      );
    if (error) toast.error(error.message);
    else {
      toast.success(`${parsedEnvs.length} secrets imported`);
      setShowConfirm(false);
      setParsedEnvs([]);
    }
    setImporting(false);
  };
  const handleSave = async () => {
    if (!form.name || !form.value)
      return toast.error("Name and value required");
    setSaving(true);
    const { error } = await supabase
      .from("env_vaults")
      .insert({
        name: form.name.trim().toUpperCase(),
        value: form.value,
        description: form.description || null,
        expires_at: form.expires_at
          ? new Date(form.expires_at).toISOString()
          : null,
      });
    if (error) toast.error(error.message);
    else {
      toast.success("Env saved");
      setForm({ name: "", value: "", description: "", expires_at: "" });
      setOpen(false);
    }
    setSaving(false);
  };

  // NEW: use ConfirmDialog
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
    if (error) toast.error("Delete failed");
    else toast.success("Deleted");
    setConfirmOpen(false);
    setEnvToDelete(null);
  };

  const handleCopy = async (env, field = "value") => {
    await navigator.clipboard.writeText(
      field === "value" ? env.value : env.name,
    );
    setCopiedId(env.id + field);
    toast.success(`${field} copied`);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const toggleReveal = (id) =>
    setRevealedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const last = envs[0];
  const filtered = envs.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase()),
  );
  const isExpired = (d) => d && new Date(d) < new Date();
  const isExpiringSoon = (d) =>
    d && new Date(d).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 7;

  return (
    <TooltipProvider>
      <div
        className="space-y-6 p-6 min-h-screen relative"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="border-2 border-dashed border-white rounded-2xl p-12 bg-white/10 flex flex-col items-center gap-4">
              <Upload className="w-12 h-12 text-white" />
              <p className="text-white text-xl font-bold">
                Drop your .env file here
              </p>
            </div>
          </div>
        )}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-background border rounded-lg w-full max-w-2xl shadow-lg flex flex-col max-h-">
              <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <h2 className="font-semibold">
                    Import {parsedEnvs.length} secrets
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConfirm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-6 space-y-2 overflow-y-auto flex-1">
                {parsedEnvs.map((p, i) => (
                  <div
                    key={i}
                    className="flex gap-2 items-center border-b pb-2"
                  >
                    <Input
                      value={p.name}
                      onChange={(e) => {
                        const c = [...parsedEnvs];
                        c[i].name = e.target.value.toUpperCase();
                        setParsedEnvs(c);
                      }}
                      className="font-mono font-bold max-w-"
                    />
                    <span>=</span>
                    <Input
                      value={p.value}
                      onChange={(e) => {
                        const c = [...parsedEnvs];
                        c[i].value = e.target.value;
                        setParsedEnvs(c);
                      }}
                      className="font-mono flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setParsedEnvs((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmImport} disabled={importing}>
                  {importing ? "Importing..." : `Import ${parsedEnvs.length}`}
                </Button>
              </div>
            </div>
          </div>
        )}
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background border rounded-lg w-full max-w-md p-6 space-y-4 shadow-lg">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Add to Vault</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="MY_API_KEY"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Value *</Label>
                  <Textarea
                    value={form.value}
                    onChange={(e) =>
                      setForm({ ...form, value: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) =>
                      setForm({ ...form, expires_at: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-2xl font-bold">Env Vault</h1>
          <div className="flex gap-2">
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
              <Upload className="w-4 h-4 mr-2" /> Import .env
            </Button>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Secret
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Secrets
              </CardTitle>
              <KeyRound className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{envs.length}</div>
              <p className="text-xs text-muted-foreground">
                Drag & drop .env to import
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Last Added</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {last?.name || "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                {last
                  ? timeAgo(new Date(last.created_at).getTime())
                  : "No secrets"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Expiring Soon
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  envs.filter(
                    (e) => e.expires_at && isExpiringSoon(e.expires_at),
                  ).length
                }
              </div>
              <p className="text-xs text-muted-foreground">With expiry date</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle>All Secrets ({filtered.length})</CardTitle>
            <Input
              placeholder="Search..."
              className="max-w-"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No secrets. Drag .env here.
                </p>
              )}
              {filtered.map((env) => {
                const revealed = revealedIds.has(env.id);
                return (
                  <div
                    key={env.id}
                    className="flex justify-between items-center border-b pb-3 last:border-0 gap-4"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium font-mono truncate">
                            {env.name}
                          </p>
                          {env.expires_at && isExpired(env.expires_at) && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                          {env.expires_at &&
                            !isExpired(env.expires_at) &&
                            isExpiringSoon(env.expires_at) && (
                              <Badge variant="secondary">Expiring</Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />{" "}
                          {timeAgo(new Date(env.created_at).getTime())}{" "}
                          {env.expires_at &&
                            `· Exp: ${new Date(env.expires_at).toLocaleDateString()}`}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {revealed ? env.value : "•".repeat(20)}{" "}
                          {env.description && `- ${env.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={revealed ? "default" : "secondary"}>
                        {revealed ? "Visible" : "Hidden"}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleReveal(env.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <TooltipContent>
                          {revealed ? "Hide" : "Reveal"}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(env, "value")}
                            >
                              {copiedId === env.id + "value" ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
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
                              size="icon"
                              onClick={() => handleDeleteClick(env)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          }
                        />
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete secret?"
          description={`Delete ${envToDelete?.name}? This cannot be undone.`}
          onConfirm={confirmDelete}
          confirmText="Delete"
          variant="destructive"
        />
      </div>
    </TooltipProvider>
  );
}
