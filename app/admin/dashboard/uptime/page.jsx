"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export default function UptimePage() {
  const [monitors, setMonitors] = useState([]) 
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
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
  }
  
  useEffect(()=>{ load() }, [])

  const add = async () => {
    if(!name || !url) return
    await fetch('/api/monitors', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url }) 
    })
    setName(''); setUrl(''); load()
  }

  const remove = async (id) => {
    if(!confirm("Remove this monitor?")) return
    await fetch(`/api/monitors?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Uptime Monitor</h1>
      {error && <div className="bg-red-500/10 text-red-500 p-3 rounded text-sm">{error}</div>}
      
      <Card>
        <CardHeader><CardTitle>Add URL</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="My API" value={name} onChange={e=>setName(e.target.value)} />
          <Input placeholder="https://..." value={url} onChange={e=>setUrl(e.target.value)} />
          <Button onClick={add}>Add</Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {monitors.length === 0 && !error && <p className="text-sm text-muted-foreground">No monitors yet. Add one above.</p>}
        {monitors.map(m => (
          <Card key={m.id} className={m.status === 'down' ? 'border-red-500' : ''}>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-sm truncate">{m.name}</CardTitle>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${m.status === 'up' ? 'bg-green-500' : m.status === 'down' ? 'bg-red-500' : 'bg-zinc-500'}`} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => remove(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs truncate text-muted-foreground">{m.url}</p>
              <div className="flex justify-between mt-3 text-sm">
                <span>{m.response_time}ms</span>
                <span>{Number(m.uptime_pct).toFixed(2)}% up</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
