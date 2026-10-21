'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Rocket, Clock, Image as ImageIcon, Trash2, Upload, Link as LinkIcon, Copy, Check } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { toast } from "sonner"

function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default function DashboardPage() {
  const supabase = createClient()
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase.from('images').select('*').order('created_at', { ascending: false })
      setImages(data || [])
    }
    fetchImages()

    const channel = supabase
      .channel('images-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'images' }, (payload) => {
        if (payload.eventType === 'INSERT') setImages((prev) => [payload.new, ...prev])
        if (payload.eventType === 'DELETE') setImages((prev) => prev.filter((img) => img.id !== payload.old.id))
        if (payload.eventType === 'UPDATE') setImages((prev) => prev.map((img) => img.id === payload.new.id ? payload.new : img))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) toast.success("Image uploaded")
    else toast.error("Upload failed")
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (img) => {
    if (!confirm('Delete from Cloudinary and Supabase?')) return
    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: img.id, public_id: img.public_id })
    })
    if (res.ok) toast.success("Deleted")
    else toast.error("Delete failed")
  }

  const handleCopy = async (img) => {
    await navigator.clipboard.writeText(img.secure_url)
    setCopiedId(img.id)
    toast.success("Link copied to clipboard")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const last = images[0]

  return (
    <TooltipProvider>
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Image Manager</h1>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
        {/* FIX 1: Button does NOT wrap another button - use ref */}
        <div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
          <Button variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.length}</div>
            <p className="text-xs text-muted-foreground">Live sync enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Upload</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{last ? timeAgo(new Date(last.created_at).getTime()) : '-'}</div>
            <p className="text-xs text-muted-foreground truncate">{last?.public_id || 'No images yet'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Cloudinary</div>
            <p className="text-xs text-muted-foreground">Realtime active</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Images ({images.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {images.length === 0 && <p className="text-sm text-muted-foreground">No images yet. Upload one.</p>}
            {images.map((img) => (
             <div key={img.id} className="flex justify-between items-center border-b pb-3 last:border-0 gap-4">
              <div className="flex gap-3 items-center min-w-0">
                <img src={img.secure_url} className="w-14 h-14 object-cover rounded-md border" alt={img.public_id} />
                <div className="min-w-0">
                  <p className="font-medium truncate">{img.public_id}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <LinkIcon className="w-3 h-3" /> {new Date(img.created_at).toLocaleString()} - {timeAgo(new Date(img.created_at).getTime())}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-">{img.secure_url}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="default">READY</Badge>

                {/* FIX 2: No nested button - TooltipTrigger asChild must wrap only ONE Button, and Button must not be inside another button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(img)} type="button">
                      {copiedId === img.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{copiedId === img.id ? 'Copied' : 'Copy link'}</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(img)} type="button">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Delete</p></TooltipContent>
                </Tooltip>

              </div>
            </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  )
}