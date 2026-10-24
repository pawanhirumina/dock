'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Check,
  Clock,
  Cloud,
  Copy,
  Image as ImageIcon,
  ImagePlus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import ConfirmDialog from "@/components/ui/confirm-dialog"
import { toast } from "@/components/ui/toast"
import { createClient } from '@/lib/supabase/client'

function timeAgo(value) {
  if (!value) return '—'
  const ms = new Date(value).getTime()
  if (Number.isNaN(ms)) return '—'
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function GalleryPage() {
  const [supabase] = useState(() => createClient())
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const dragDepth = useRef(0)

  useEffect(() => {
    let active = true

    const fetchImages = async () => {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false })

      if (!active) return
      if (error) {
        toast.add({
          type: 'error',
          title: 'Could not load images',
          description: error.message,
        })
      } else {
        setImages(data || [])
      }
      setLoading(false)
    }

    fetchImages()

    const channel = supabase
      .channel('images-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'images' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setImages((prev) =>
              prev.some((image) => image.id === payload.new.id)
                ? prev
                : [payload.new, ...prev],
            )
          }
          if (payload.eventType === 'DELETE') {
            setImages((prev) =>
              prev.filter((image) => image.id !== payload.old.id),
            )
          }
          if (payload.eventType === 'UPDATE') {
            setImages((prev) =>
              prev.map((image) =>
                image.id === payload.new.id ? payload.new : image,
              ),
            )
          }
        },
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return images
    return images.filter(
      (image) =>
        image.public_id?.toLowerCase().includes(query) ||
        image.secure_url?.toLowerCase().includes(query),
    )
  }, [images, search])

  const handleDragEnter = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current += 1
    setDragActive(true)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragActive(false)
  }

  const uploadFile = async (file) => {
    if (!file.type.startsWith('image/')) {
      toast.add({
        type: 'error',
        title: 'Unsupported file',
        description: 'Choose an image file to upload.',
      })
      return
    }

    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed')
      }

      if (data?.id) {
        setImages((prev) =>
          prev.some((image) => image.id === data.id) ? prev : [data, ...prev],
        )
      }
      toast.add({
        type: 'success',
        title: 'Image uploaded',
        description: 'Your image is live on Cloudinary.',
      })
    } catch (error) {
      toast.add({
        type: 'error',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = 0
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) await uploadFile(file)
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (file) await uploadFile(file)
    event.target.value = ''
  }

  const handleDeleteClick = (image) => {
    setImageToDelete(image)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!imageToDelete) return

    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: imageToDelete.id,
        public_id: imageToDelete.public_id,
      }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      toast.add({
        type: 'error',
        title: 'Delete failed',
        description: data?.error || 'Please try again.',
      })
    } else {
      setImages((prev) =>
        prev.filter((image) => image.id !== imageToDelete.id),
      )
      toast.add({
        type: 'success',
        title: 'Image deleted',
        description: 'Removed from Cloudinary and your database.',
      })
    }
    setConfirmOpen(false)
    setImageToDelete(null)
  }

  const handleCopy = async (image) => {
    try {
      await navigator.clipboard.writeText(image.secure_url)
      setCopiedId(image.id)
      toast.add({
        type: 'success',
        title: 'Link copied',
        description: 'Image URL is ready to paste.',
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.add({
        type: 'error',
        title: 'Copy failed',
        description: 'Your browser blocked clipboard access.',
      })
    }
  }

  const last = images[0]

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
                <p className="text-lg font-semibold">Drop your image</p>
                <p className="text-sm text-muted-foreground">
                  It will be uploaded to Cloudinary automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
            <p className="max-w-prose text-sm text-muted-foreground">
              Upload and manage images hosted on Cloudinary. Changes sync in
              realtime.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
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
              {uploading ? 'Uploading...' : 'Upload image'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium">Total images</CardTitle>
              <ImageIcon className="size-4 text-muted-foreground" />
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
                  {last ? timeAgo(last.created_at) : '—'}
                </span>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {last?.public_id || 'No images yet'}
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
              <CardTitle>Images</CardTitle>
              <CardDescription>
                {search
                  ? `${filtered.length} of ${images.length} images`
                  : `${images.length} ${images.length === 1 ? 'image' : 'images'} in your library`}
              </CardDescription>
            </div>
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search images..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search images"
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </CardHeader>

          <CardContent>
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
                    {search ? 'No matching images' : 'Your gallery is empty'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {search
                      ? `Nothing matches “${search}”. Try a different search.`
                      : 'Upload an image or drag one anywhere on this page to get started.'}
                  </EmptyDescription>
                </EmptyHeader>
                {!search && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload data-icon="inline-start" />
                      Upload your first image
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((image) => (
                  <div
                    key={image.id}
                    className="group flex flex-col overflow-hidden rounded-xl border bg-card"
                  >
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      <Image
                        src={image.secure_url}
                        alt={image.public_id || 'Uploaded image'}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
                        <Badge variant="secondary">Ready</Badge>
                        <div className="flex items-center gap-1 rounded-lg bg-background/80 p-1 backdrop-blur">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label="Copy image link"
                                  onClick={() => handleCopy(image)}
                                >
                                  {copiedId === image.id ? <Check /> : <Copy />}
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
                                  aria-label="Delete image"
                                  onClick={() => handleDeleteClick(image)}
                                >
                                  <Trash2 />
                                </Button>
                              }
                            />
                            <TooltipContent>Delete image</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                      <p className="truncate text-sm font-medium">
                        {image.public_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(image.created_at)} · {new Date(image.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete image?"
          description={`Delete ${imageToDelete?.public_id}? This removes it from Cloudinary and Supabase and cannot be undone.`}
          onConfirm={confirmDelete}
          confirmText="Delete"
          loadingText="Deleting..."
          variant="destructive"
        />
      </div>
    </TooltipProvider>
  )
}
