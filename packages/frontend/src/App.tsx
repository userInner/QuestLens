import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import HomePage from './pages/HomePage'

// Lazy load other pages
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const CreatePage = lazy(() => import('./pages/CreatePage'))
const DocsPage = lazy(() => import('./pages/DocsPage'))
const IdolDetailPage = lazy(() => import('./pages/IdolDetailPage'))
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'))
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'))
const IdolProfilePage = lazy(() => import('./pages/IdolProfilePage'))

// Skeleton loader for pages
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
    <div className="text-center">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center mx-auto mb-4 animate-pulse">
        <span className="text-white font-bold text-xl">N</span>
      </div>
      <p className="text-[var(--text-muted)] text-sm">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route 
          path="/explore" 
          element={
            <Suspense fallback={<PageLoader />}>
              <ExplorePage />
            </Suspense>
          } 
        />
        <Route 
          path="/create" 
          element={
            <Suspense fallback={<PageLoader />}>
              <CreatePage />
            </Suspense>
          } 
        />
        <Route 
          path="/docs" 
          element={
            <Suspense fallback={<PageLoader />}>
              <DocsPage />
            </Suspense>
          } 
        />
        <Route 
          path="/idol/:address" 
          element={
            <Suspense fallback={<PageLoader />}>
              <IdolDetailPage />
            </Suspense>
          } 
        />
        <Route 
          path="/portfolio" 
          element={
            <Suspense fallback={<PageLoader />}>
              <PortfolioPage />
            </Suspense>
          } 
        />
        <Route 
          path="/agent" 
          element={
            <Suspense fallback={<PageLoader />}>
              <AgentDashboard />
            </Suspense>
          } 
        />
        <Route 
          path="/vivian" 
          element={
            <Suspense fallback={<PageLoader />}>
              <IdolProfilePage />
            </Suspense>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
