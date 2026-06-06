import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [status, setStatus] = useState('Checking connection...')

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        setStatus('❌ Connection failed — check your env vars')
      } else {
        setStatus('✅ Supabase connected successfully')
      }
    })
  }, [])

  return (
    <div>
      <h1>Gansbaai Adventure Network</h1>
      <h2>Phase 0 — Connection test</h2>

      <div>
        <p>{status}</p>
      </div>
    </div>
  )
}

export default App
