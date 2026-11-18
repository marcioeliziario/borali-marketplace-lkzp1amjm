/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import MarketplaceHome from './pages/MarketplaceHome'
import StoreFront from './pages/StoreFront'
import Login from './pages/Login'
import { MerchantDashboard } from './pages/MerchantDashboard'
import AdminDashboard from './pages/AdminDashboard'
import RoadmapPage from './pages/RoadmapPage'
import CartPage from './pages/CartPage'
import ProfilePage from './pages/ProfilePage'
import NotFound from './pages/NotFound'
import { AuthProvider } from './contexts/AuthContext'
import { CityProvider } from './contexts/CityContext'
import { CartProvider } from './contexts/CartContext'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <CityProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route element={<Layout />}>
                {/* Rota inicial redireciona para a primeira cidade piloto Óbidos */}
                <Route path="/" element={<Navigate to="/obidos" replace />} />

                {/* Rota da Cidade / Marketplace */}
                <Route path="/:citySlug" element={<MarketplaceHome />} />

                {/* Loja Virtual no formato /cidade/estabelecimento */}
                <Route path="/:citySlug/:storeSlug" element={<StoreFront />} />

                {/* Autenticação & Perfil */}
                <Route path="/login" element={<Login />} />
                <Route path="/perfil" element={<ProfilePage />} />

                {/* Carrinho / Pedidos */}
                <Route path="/carrinho" element={<CartPage />} />
                <Route path="/pedidos" element={<CartPage />} />

                {/* Painéis Protegidos */}
                <Route path="/painel-lojista" element={<MerchantDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />

                {/* Documentação de Roadmap do Projeto (v0.1 a v1.0) */}
                <Route path="/roadmap" element={<RoadmapPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </CartProvider>
      </CityProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
