import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage    from './pages/LandingPage'
import RegisterPage   from './pages/RegisterPage'
import CheckpointPage from './pages/CheckpointPage'
import CompletePage   from './pages/CompletePage'
import BlockedPage    from './pages/BlockedPage'
import AdminPage      from './pages/AdminPage'
import PartnerPage    from './pages/PartnerPage'
import AdminNewAdventurePage from './pages/AdminNewAdventurePage'
import AdminEditAdventurePage from './pages/AdminEditAdventurePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/c/:slug" element={<CheckpointPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="/blocked"  element={<BlockedPage />} />
        <Route path="/admin"   element={<AdminPage />} />
        <Route path="/partner/:slug" element={<PartnerPage />} />
        <Route path="/admin/new-adventure" element={<AdminNewAdventurePage />} />
        <Route path="/admin/edit-adventure" element={<AdminEditAdventurePage />} />
      </Routes>
    </BrowserRouter>
  )
}