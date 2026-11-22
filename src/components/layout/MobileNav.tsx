import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Search, ShoppingBag, User } from 'lucide-react'
import { useCity } from '@/contexts/CityContext'
import { useCart } from '@/contexts/CartContext'

export const MobileNav: React.FC = () => {
  const location = useLocation()
  const { selectedCity } = useCity()
  const { totalCount } = useCart()

  const citySlug = selectedCity?.slug || 'obidos'

  const navItems = [
    {
      label: 'Início',
      path: `/${citySlug}`,
      icon: Home,
      isActive:
        location.pathname === '/' ||
        location.pathname === `/${citySlug}` ||
        location.pathname.startsWith(`/${citySlug}/`),
    },
    {
      label: 'Buscar',
      path: `/${citySlug}?busca=1`,
      icon: Search,
      isActive: location.search.includes('busca=1'),
    },
    {
      label: 'Pedidos',
      path: '/pedidos',
      icon: ShoppingBag,
      badge: totalCount > 0 ? totalCount : undefined,
      isActive: location.pathname === '/pedidos' || location.pathname === '/carrinho',
    },
    {
      label: 'Perfil',
      path: '/perfil',
      icon: User,
      isActive:
        location.pathname === '/perfil' ||
        location.pathname === '/login' ||
        location.pathname.startsWith('/painel') ||
        location.pathname.startsWith('/admin'),
    },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 safe-area-bottom">
      <div className="grid grid-cols-4 items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.isActive
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 transition-colors relative ${
                active ? 'text-[#1754AE] font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#E63239] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5">{item.label}</span>
              {active && <span className="w-4 h-1 bg-[#1754AE] rounded-full mt-0.5" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav
