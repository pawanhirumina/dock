"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  Clock,
  Cloud,
  Copy,
  File as FileIcon,
  FileText,
  Film,
  Files,
  ExternalLink,
  Image as ImageIcon,
  ImagePlus,
  Music,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

/* ---------- media helpers ---------- */

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "svg",
  "bmp",
  "ico",
]);
const VIDEO_EXT = new Set([
  "mp4",
  "webm",
  "mov",
  "m4v",
  "mkv",
  "avi",
  "ogv",
  "flv",
  "wmv",
  "3gp",
]);
const AUDIO_EXT = new Set([
  "mp3",
  "wav",
  "ogg",
  "oga",
  "m4a",
  "aac",
  "flac",
  "opus",
  "wma",
  "aiff",
]);
const DOC_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "md",
  "csv",
  "rtf",
  "json",
]);

const KIND_META = {
  image: { label: "Image", Icon: ImageIcon },
  video: { label: "Video", Icon: Film },
  audio: { label: "Audio", Icon: Music },
  document: { label: "Document", Icon: FileText },
  file: { label: "File", Icon: FileIcon },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "document", label: "Documents" },
  { value: "file", label: "Other" },
];

function getExt(item) {
  if (item?.format) return String(item.format).toLowerCase();
  const path = (item?.secure_url || "").split("?")[0];
  const match = path.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

function getKind(item) {
  const ext = getExt(item);
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  if (AUDIO_EXT.has(ext)) return "audio";
  if (DOC_EXT.has(ext)) return "document";
  // Fall back to Cloudinary's resource_type when the extension is unknown
  if (item?.resource_type === "image") return "image";
  if (item?.resource_type === "video") return "video";
  return "file";
}

// Cloudinary stores audio under "video" and non-media files under "raw".
function getResourceType(item) {
  if (item?.resource_type) return item.resource_type;
  const kind = getKind(item);
  if (kind === "video" || kind === "audio") return "video";
  if (kind === "image" || getExt(item) === "pdf") return "image";
  return "raw";
}

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

function MediaPreview({ item, kind }) {
  const ext = getExt(item);
  const { Icon } = KIND_META[kind];

  if (kind === "image") {
    return (
      <Image
        src={item.secure_url}
        alt={item.public_id || "Uploaded image"}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        unoptimized={ext === "svg" || ext === "gif"}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  if (kind === "video") {
    return (
      <video
        src={item.secure_url}
        controls
        preload="metadata"
        className="size-full bg-black object-contain"
      />
    );
  }

  if (kind === "audio") {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-3 px-3 pt-6">
        <Icon className="size-8 text-muted-foreground" />
        <audio
          src={item.secure_url}
          controls
          preload="none"
          className="w-full"
        />
      </div>
    );
  }

  return (
    <a
      href={item.secure_url}
      target="_blank"
      rel="noreferrer"
      className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="size-10" />
      <span className="text-sm font-medium uppercase tracking-wide">
        {ext || "file"}
      </span>
    </a>
  );
}

/* ---------- page ---------- */

export default function GalleryPage() {
  const [supabase] = useState(() => createClient());
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const fileInputRef = useRef(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    let active = true;

    const fetchImages = async () => {
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        toast.add({
          type: "error",
          title: "Could not load files",
          description: error.message,
        });
      } else {
        setImages(data || []);
      }
      setLoading(false);
    };

    fetchImages();

    const channel = supabase
      .channel("images-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "images" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setImages((prev) =>
              prev.some((image) => image.id === payload.new.id)
                ? prev
                : [payload.new, ...prev],
            );
          }
          if (payload.eventType === "DELETE") {
            setImages((prev) =>
              prev.filter((image) => image.id !== payload.old.id),
            );
          }
          if (payload.eventType === "UPDATE") {
            setImages((prev) =>
              prev.map((image) =>
                image.id === payload.new.id ? payload.new : image,
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

  const counts = useMemo(() => {
    const result = {
      all: images.length,
      image: 0,
      video: 0,
      audio: 0,
      document: 0,
      file: 0,
    };
    for (const item of images) result[getKind(item)] += 1;
    return result;
  }, [images]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return images.filter((item) => {
      if (filter !== "all" && getKind(item) !== filter) return false;
      if (!query) return true;
      return (
        item.public_id?.toLowerCase().includes(query) ||
        item.original_filename?.toLowerCase().includes(query) ||
        item.format?.toLowerCase().includes(query) ||
        item.secure_url?.toLowerCase().includes(query)
      );
    });
  }, [images, search, filter]);

  const isFiltering = Boolean(search.trim()) || filter !== "all";

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

  const uploadFile = async (file) => {
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      if (data?.id) {
        setImages((prev) =>
          prev.some((image) => image.id === data.id) ? prev : [data, ...prev],
        );
      }
      toast.add({
        type: "success",
        title: "File uploaded",
        description: `${file.name} is live on Cloudinary.`,
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: "Upload failed",
        description:
          error instanceof Error
            ? `${file.name}: ${error.message}`
            : "Please try again.",
      });
    }
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadFile(file);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragActive(false);
    await uploadFiles(event.dataTransfer.files);
  };

  const handleUpload = async (event) => {
    const files = event.target.files;
    await uploadFiles(files);
    event.target.value = "";
  };

  const handleDeleteClick = (image) => {
    setImageToDelete(image);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;

    const res = await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: imageToDelete.id,
        public_id: imageToDelete.public_id,
        resource_type: getResourceType(imageToDelete),
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.add({
        type: "error",
        title: "Delete failed",
        description: data?.error || "Please try again.",
      });
    } else {
      setImages((prev) =>
        prev.filter((image) => image.id !== imageToDelete.id),
      );
      toast.add({
        type: "success",
        title: "File deleted",
        description: "Removed from Cloudinary and your database.",
      });
    }
    setConfirmOpen(false);
    setImageToDelete(null);
  };

  const handleCopy = async (image) => {
    try {
      await navigator.clipboard.writeText(image.secure_url);
      setCopiedId(image.id);
      toast.add({
        type: "success",
        title: "Link copied",
        description: "File URL is ready to paste.",
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

  const last = images[0];

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
                <p className="text-lg font-semibold">Drop your files</p>
                <p className="text-sm text-muted-foreground">
                  Images, video, audio, documents and more upload to Cloudinary
                  automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
            <p className="max-w-prose text-sm text-muted-foreground">
              Upload and manage media hosted on Cloudinary. Changes sync in
              realtime.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Upload data-icon="inline-start" />
              )}
              {uploading ? "Uploading..." : "Upload files"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium">Total files</CardTitle>
              <Files className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {loading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <span className="text-2xl font-semibold tabular-nums">
                  {images.length}
                </span>
              )}
              <p className="text-xs text-muted-foreground">Live sync enabled</p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium">Last upload</CardTitle>
              <Clock className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {loading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <span className="text-2xl font-semibold tabular-nums">
                  {last ? timeAgo(last.created_at) : "—"}
                </span>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {last?.public_id || "No files yet"}
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium">Storage</CardTitle>
              <Cloud className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <span className="text-2xl font-semibold">Cloudinary</span>
              <p className="text-xs text-muted-foreground">
                Realtime updates active
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Files</CardTitle>
              <CardDescription>
                {isFiltering
                  ? `${filtered.length} of ${images.length} files`
                  : `${images.length} ${images.length === 1 ? "file" : "files"} in your library`}
              </CardDescription>
            </div>
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search files..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search files"
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

          <CardContent className="flex flex-col gap-4">
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label="Filter by type"
            >
              {FILTERS.filter(
                (item) => item.value === "all" || counts[item.value] > 0,
              ).map((item) => (
                <Button
                  key={item.value}
                  size="sm"
                  variant={filter === item.value ? "secondary" : "ghost"}
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                  <span className="tabular-nums text-muted-foreground">
                    {counts[item.value]}
                  </span>
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ImagePlus />
                  </EmptyMedia>
                  <EmptyTitle>
                    {isFiltering
                      ? "No matching files"
                      : "Your gallery is empty"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {isFiltering
                      ? search
                        ? `Nothing matches “${search}”. Try a different search or filter.`
                        : "No files of this type yet."
                      : "Upload a file or drag one anywhere on this page to get started."}
                  </EmptyDescription>
                </EmptyHeader>
                {!isFiltering && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload data-icon="inline-start" />
                      Upload your first file
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((item) => {
                  const kind = getKind(item);
                  const ext = getExt(item);
                  const interactive = kind === "video" || kind === "audio";
                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col overflow-hidden rounded-xl border bg-card"
                    >
                      <div className="relative aspect-video overflow-hidden bg-muted">
                        <MediaPreview item={item} kind={kind} />
                        <div
                          className={`absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 ${
                            interactive ? "pointer-events-none" : ""
                          }`}
                        >
                          <Badge variant="secondary">
                            {KIND_META[kind].label}
                          </Badge>
                          <div className="pointer-events-auto flex items-center gap-1 rounded-lg bg-background/80 p-1 backdrop-blur">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label="Open in new tab"
                                    onClick={() =>
                                      window.open(
                                        item.secure_url,
                                        "_blank",
                                        "noopener,noreferrer",
                                      )
                                    }
                                  >
                                    <ExternalLink />
                                  </Button>
                                }
                              />
                              <TooltipContent>Open</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label="Copy file link"
                                    onClick={() => handleCopy(item)}
                                  >
                                    {copiedId === item.id ? (
                                      <Check />
                                    ) : (
                                      <Copy />
                                    )}
                                  </Button>
                                }
                              />
                              <TooltipContent>Copy link</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-destructive hover:text-destructive"
                                    aria-label="Delete file"
                                    onClick={() => handleDeleteClick(item)}
                                  >
                                    <Trash2 />
                                  </Button>
                                }
                              />
                              <TooltipContent>Delete file</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 p-3">
                        <p className="truncate text-sm font-medium">
                          {item.public_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ext ? `${ext.toUpperCase()} · ` : ""}
                          {timeAgo(item.created_at)} ·{" "}
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete file?"
          description={`Delete ${imageToDelete?.public_id}? This removes it from Cloudinary and Supabase and cannot be undone.`}
          onConfirm={confirmDelete}
          confirmText="Delete"
          loadingText="Deleting..."
          variant="destructive"
        />
      </div>
    </TooltipProvider>
  );
}
