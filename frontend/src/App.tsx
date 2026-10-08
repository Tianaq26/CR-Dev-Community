import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AppLayout, RequireAuth } from './components/Layout'
import { Loading } from './components/states'
import Landing from './pages/Landing'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import FeedPage from './pages/Feed'
import NotFound from './pages/NotFound'

// Heavier, less-visited screens load on demand.
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetail'))
const ProjectFormPage = lazy(() => import('./pages/ProjectForm'))
const IdeasPage = lazy(() => import('./pages/Ideas'))
const IdeaDetailPage = lazy(() => import('./pages/IdeaDetail'))
const PeoplePage = lazy(() => import('./pages/People'))
const ProfilePage = lazy(() => import('./pages/Profile'))
const ProfileEditPage = lazy(() => import('./pages/ProfileEdit'))
const InboxPage = lazy(() => import('./pages/Inbox'))

function Home() {
  const { user, ready } = useAuth()
  if (!ready) return <Loading />
  return user ? <Navigate to="/feed" replace /> : <Landing />
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          <Route element={<RequireAuth />}>
            <Route path="feed" element={<FeedPage />} />
            <Route path="projects/new" element={<ProjectFormPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="projects/:id/edit" element={<ProjectFormPage />} />
            <Route path="ideas" element={<IdeasPage />} />
            <Route path="ideas/:id" element={<IdeaDetailPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="people/:id" element={<ProfilePage />} />
            <Route path="me/edit" element={<ProfileEditPage />} />
            <Route path="inbox" element={<InboxPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
