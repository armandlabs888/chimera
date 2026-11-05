import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BeamProvider } from './context/BeamContext'
import { Browse } from './pages/Browse'
import { HelperProfile } from './pages/HelperProfile'
import { Home } from './pages/Home'
import { Messages } from './pages/Messages'
import { PostRequest } from './pages/PostRequest'
import { RequestDetail } from './pages/RequestDetail'
import { Safety } from './pages/Safety'
import { You } from './pages/You'

export default function App() {
  return (
    <BeamProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="browse" element={<Browse />} />
            <Route path="post" element={<PostRequest />} />
            <Route path="requests/:id" element={<RequestDetail />} />
            <Route path="people/:id" element={<HelperProfile />} />
            <Route path="you" element={<You />} />
            <Route path="safety" element={<Safety />} />
            <Route path="messages/:threadId" element={<Messages />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BeamProvider>
  )
}
