"use client"
import { useEffect, useState } from 'react'
import ConfirmDialog from "@/components/ui/confirm-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

export default function UptimePage() {
  const [monitors, setMonitors] = useState([]) 
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [idToDelete, setIdToDelete] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/monitors')
      const json = await res.json()
      if (Array.isArray(json)) {
        setMonitors(json)
        setError('')
      } else {
        setError(json.error || "Failed to load")
        setMonitors([])
      }
    } catch (e) {
      setError(e.message)
      setMonitors([])
    }
    setLoading(false)
  }
  
  useEffect(()=>{ load() }, [])

  const add = async () => {
    if(!name || !url) return toast.error("Name and URL required")
    try { new URL(url) } catch {
      return toast.error("Invalid URL - must start with https://")
    }
    const res = await fetch('/api/monitors', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url }) 
    })
    if(!res.ok){
      const j = await res.json().catch(()=>({}))
      toast.error(j.error || "Failed to add")
    } else {
      toast.success("Monitor added")
      setName(''); setUrl(''); 
      load()
    }
  }

  const askRemove = (id) => {
    setIdToDelete(id)
    setConfirmOpen(true)
  }

  const confirmRemove = async () => {
    if(!idToDelete) return
    await fetch(`/api/monitors?id=${idToDelete}`, { method: 'DELETE' })
    toast.success("Removed")
    setConfirmOpen(false)
    setIdToDelete(null)
    load()
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Uptime Monitor</h1>
      {error && <div className="bg-red-500/10 text-red-500 p-3 rounded text-sm">{error}</div>}
      
      <Card>
        <CardHeader><CardTitle>Add URL</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Input placeholder="My API" value={name} onChange={e=>setName(e.target.value)} className="flex-1 min-w-[150px]" />
          <Input placeholder="https://..." value={url} onChange={e=>setUrl(e.target.value)} className="flex-[2] min-w-[220px]" />
          <Button onClick={add}>Add</Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {monitors.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">No monitors yet. Add one above.</p>
          )}
          {monitors.map(m => (
            <Card key={m.id} className={m.status === 'down' ? 'border-red-500' : ''}>
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="text-sm truncate">{m.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${m.status === 'up' ? 'bg-green-500' : m.status === 'down' ? 'bg-red-500' : 'bg-zinc-500'}`} />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => askRemove(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs truncate text-muted-foreground" title={m.url}>{m.url}</p>
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-muted-foreground">{m.response_time ?? '-'}ms</span>
                  <span className="font-medium">{m.uptime_pct != null ? Number(m.uptime_pct).toFixed(2) : '0.00'}% up</span>
                </div>
                {m.last_checked && (
                  <p className="text-[11px] text-muted-foreground mt-1">Last: {new Date(m.last_checked).toLocaleTimeString()}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog 
        open={confirmOpen} 
        onOpenChange={setConfirmOpen}
        title="Remove monitor?" 
        description="Are you sure you want to remove this monitor? This cannot be undone." 
        onConfirm={confirmRemove}
        confirmText="Remove"
        variant="destructive"
      />
    </div>
  )
}