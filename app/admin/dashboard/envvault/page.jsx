'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { KeyRound, Clock, Calendar, Trash2, Copy, Check, Eye, EyeOff, Plus, Shield, Upload, FileText, X } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { toast } from "sonner"

function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function parseEnvFile(text) {
  const envs = []
  const lines = text.split('\n')
  for (let line of lines) {
    line = line.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) continue
    // support export KEY=VALUE
    if (line.startsWith('export ')) line = line.slice(7).trim()
    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) continue
    let name = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()
    // remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (name && value) envs.push({ name: name.toUpperCase(), value, description: 'Imported from .env' })
  }
  return envs
}

export default function EnvVaultPage() {
  const supabase = createClient()
  const [envs, setEnvs] = useState([])
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [revealedIds, setRevealedIds] = useState(new Set())
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', value: '', description: '', expires_at: '' })

  // drag & drop states
  const [dragActive, setDragActive] = useState(false)
  const [parsedEnvs, setParsedEnvs] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const fetchEnvs = async () => {
      const { data } = await supabase.from('env_vaults').select('*').order('created_at', { ascending: false })
      setEnvs(data || [])
    }
    fetchEnvs()

    const channel = supabase
      .channel('envs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'env_vaults' }, (payload) => {
        if (payload.eventType === 'INSERT') setEnvs((prev) => [payload.new, ...prev])
        if (payload.eventType === 'DELETE') setEnvs((prev) => prev.filter((e) => e.id !== payload.old.id))
        if (payload.eventType === 'UPDATE') setEnvs((prev) => prev.map((e) => e.id === payload.new.id ? payload.new : e))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // DRAG HANDLERS
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    processFile(file)
  }

  const processFile = async (file) => {
    if (!file.name.includes('.env') && file.type !== '' && !file.name.endsWith('.txt')) {
      // still allow but warn
      if (!confirm(`${file.name} doesn't look like .env, parse anyway?`)) return
    }
    const text = await file.text()
    const parsed = parseEnvFile(text)
    if (parsed.length === 0) {
      toast.error("No valid KEY=VALUE found in file")
      return
    }
    setParsedEnvs(parsed)
    setShowConfirm(true)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
    e.target.value = ''
  }

  const confirmImport = async () => {
    setImporting(true)
    const { error } = await supabase.from('env_vaults').insert(
      parsedEnvs.map(p => ({
        name: p.name,
        value: p.value,
        description: p.description,
        expires_at: null
      }))
    )
    if (error) toast.error(error.message)
    else {
      toast.success(`${parsedEnvs.length} secrets imported`)
      setShowConfirm(false)
      setParsedEnvs([])
    }
    setImporting(false)
  }

  const handleSave = async () => {
    if (!form.name || !form.value) {
      toast.error("Name and value required")
      return
    }
    setSaving(true)
    const { error } = await supabase.from('env_vaults').insert({
      name: form.name.trim(),
      value: form.value,
      description: form.description || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    })
    if (error) toast.error(error.message)
    else {
      toast.success("Env saved to vault")
      setForm({ name: '', value: '', description: '', expires_at: '' })
      setOpen(false)
    }
    setSaving(false)
  }

  const handleDelete = async (env) => {
    if (!confirm(`Delete ${env.name}?`)) return
    const { error } = await supabase.from('env_vaults').delete().eq('id', env.id)
    if (error) toast.error("Delete failed")
    else toast.success("Deleted")
  }

  const handleCopy = async (env, field = 'value') => {
    await navigator.clipboard.writeText(field === 'value' ? env.value : env.name)
    setCopiedId(env.id + field)
    toast.success(`${field === 'value' ? 'Value' : 'Name'} copied`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleReveal = (id) => {
    setRevealedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const last = envs[0]
  const filtered = envs.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    (e.description && e.description.toLowerCase().includes(search.toLowerCase()))
  )

  const isExpired = (date) => date && new Date(date) < new Date()
  const isExpiringSoon = (date) => date && new Date(date).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 7

  return (
    <TooltipProvider>
    <div 
      className="space-y-6 p-6 min-h-screen relative"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {/* DRAG OVERLAY */}
      {dragActive && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="border-2 border-dashed border-white rounded-2xl p-12 bg-white/10 flex flex-col items-center gap-4">
            <Upload className="w-12 h-12 text-white" />
            <p className="text-white text-xl font-bold">Drop your .env file here</p>
            <p className="text-white/70 text-sm">Auto-parse KEY=VALUE and add to vault</p>
          </div>
        </div>
      )}

      {/* CONFIRM IMPORT MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border rounded-lg w-full max-w-2xl shadow-lg max-h- flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Confirm Import ({parsedEnvs.length} secrets)</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowConfirm(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-6 space-y-2 overflow-y-auto flex-1">
              {parsedEnvs.map((p, i) => (
                <div key={i} className="flex gap-2 items-center border-b pb-2">
                  <Input value={p.name} onChange={e => {
                    const copy = [...parsedEnvs]
                    copy[i].name = e.target.value.toUpperCase()
                    setParsedEnvs(copy)
                  }} className="font-mono font-bold max-w-[200px]" />
                  <span className="text-muted-foreground">=</span>
                  <Input value={p.value} type="text" onChange={e => {
                    const copy = [...parsedEnvs]
                    copy[i].value = e.target.value
                    setParsedEnvs(copy)
                  }} className="font-mono flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => setParsedEnvs(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
            <div className="p-6 border-t flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button onClick={confirmImport} disabled={importing}>{importing ? 'Importing...' : `Import ${parsedEnvs.length} Secrets`}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SINGLE MODAL - custom no Dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg w-full max-w-md p-6 space-y-4 shadow-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Add to Vault</h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name * (e.g. STRIPE_SECRET_KEY)</Label>
                <Input placeholder="MY_API_KEY" value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-2">
                <Label>Value *</Label>
                <Textarea placeholder="sk_live_..." value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input placeholder="For prod deployment" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (optional)</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save to Vault'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Env Vault</h1>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".env,.txt,*" className="hidden" onChange={handleFileSelect} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
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
            <CardTitle className="text-sm font-medium">Total Secrets</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{envs.length}</div>
            <p className="text-xs text-muted-foreground">Drag & drop .env to import</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Added</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{last ? last.name : '-'}</div>
            <p className="text-xs text-muted-foreground">{last ? timeAgo(new Date(last.created_at).getTime()) : 'No secrets yet'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{envs.filter(e => e.expires_at && isExpiringSoon(e.expires_at)).length}</div>
            <p className="text-xs text-muted-foreground">With expiry date set</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Secrets ({filtered.length})</CardTitle>
          <Input placeholder="Search name..." className="max-w-[400px]" value={search} onChange={e => setSearch(e.target.value)} />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No secrets yet. Drag your .env file here or Add one.</p>}
            {filtered.map((env) => {
              const revealed = revealedIds.has(env.id)
              const expired = env.expires_at && isExpired(env.expires_at)
              const expSoon = env.expires_at && isExpiringSoon(env.expires_at)
              return (
             <div key={env.id} className="flex justify-between items-center border-b pb-3 last:border-0 gap-4">
              <div className="flex gap-3 items-center min-w-0">
                <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium font-mono truncate">{env.name}</p>
                    {expired && <Badge variant="destructive">Expired</Badge>}
                    {!expired && expSoon && <Badge variant="secondary">Expiring</Badge>}
                    {env.expires_at && !expired && !expSoon && <Badge variant="outline">Dated</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Clock className="w-3 h-3" /> {new Date(env.created_at).toLocaleString()} · {timeAgo(new Date(env.created_at).getTime())}
                    {env.expires_at && ` · Exp: ${new Date(env.expires_at).toLocaleDateString()}`}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground truncate max-w-">
                    {revealed ? env.value : '•'.repeat(20)} {env.description && `- ${env.description}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={revealed ? "default" : "secondary"}>{revealed ? "Visible" : "Hidden"}</Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => toggleReveal(env.id)} type="button">
                      {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{revealed ? 'Hide' : 'Reveal'}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(env, 'value')} type="button">
                      {copiedId === env.id + 'value' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Copy value</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(env)} type="button">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Delete</p></TooltipContent>
                </Tooltip>
              </div>
            </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  )
}