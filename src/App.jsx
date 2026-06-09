import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage    from './pages/LandingPage'
import RegisterPage   from './pages/RegisterPage'
import CheckpointPage from './pages/CheckpointPage'
import CompletePage   from './pages/CompletePage'
import BlockedPage    from './pages/BlockedPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/c/:slug" element={<CheckpointPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="/blocked"  element={<BlockedPage />} />
      </Routes>
    </BrowserRouter>
  )
}