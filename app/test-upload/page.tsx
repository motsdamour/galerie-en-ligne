'use client'
import { useRef, useState } from 'react'

export default function TestUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [log, setLog] = useState<string[]>([])
  const [slug, setSlug] = useState('charles-marine-19-juillet-2026')

  const addLog = (msg: string) => setLog(prev => [...prev, msg])

  const handleClick = () => {
    addLog('Bouton cliqué')
    inputRef.current?.click()
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    addLog(`onChange déclenché - ${files?.length} fichier(s)`)
    if (!files || files.length === 0) return

    const file = files[0]
    addLog(`Fichier: ${file.name} ${file.size} bytes ${file.type}`)

    const formData = new FormData()
    formData.append('file', file)

    const url = `/api/gallery/${slug}/upload`
    addLog(`Envoi vers ${url}...`)

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      addLog(`Réponse: ${res.status} - ${JSON.stringify(data)}`)
    } catch (err) {
      addLog(`Erreur: ${String(err)}`)
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'monospace' }}>
      <h1>Test Upload</h1>
      <div style={{ marginBottom: 20 }}>
        <label>Slug : </label>
        <input
          type="text"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          style={{ padding: '6px 10px', width: 400, border: '1px solid #ccc', borderRadius: 4 }}
        />
      </div>
      <button onClick={handleClick} style={{ padding: '10px 20px', marginBottom: 20 }}>
        Choisir un fichier
      </button>
      <input ref={inputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleChange} />
      <div>
        {log.map((l, i) => <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>{l}</div>)}
      </div>
    </div>
  )
}
