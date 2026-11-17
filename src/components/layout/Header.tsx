import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MapPin,
  ChevronDown,
  ShoppingBag,
  User,
  ShieldCheck,
  Store,
  Compass,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { BoraliLogo } from '@/components/brand/BoraliLogo'
import { useCity } from '@/contexts/CityContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Header: React.FC = () => {
  const { cities, selectedCity, setSelectedCity } = useCity()
  const { user, logout, isAdmin, isMerchant } = useAuth()
  const { totalCount, totalAmount } = useCart()
  const navigate = useNavigate()

  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('Centro, Óbidos - PA (Toque para alterar)')

  const handleCityChange = (slug: string) => {
    const city = cities.find((c) => c.slug === slug)
    if (city) {
      setSelectedCity(city)
      navigate(`/${city.slug}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[#1754AE] text-white shadow-md">
      {/* Top bar com Cidade e Endereço */}
      <div className="border-b border-white/10 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Seletor de Cidade */}
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#E63239] animate-bounce" />
            <span className="text-white/70 hidden sm:inline">Você está em:</span>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 font-semibold text-white hover:text-white/90 bg-white/10 px-2 py-0.5 rounded transition">
                <span>
                  {selectedCity ? `${selectedCity.name} - ${selectedCity.state}` : 'Carregando...'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-white text-slate-800 shadow-xl">
                <DropdownMenuLabel className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Cidades atendidas (Borali)
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {cities.map((city) => (
                  <DropdownMenuItem
                    key={city.id}
                    onClick={() => handleCityChange(city.slug)}
                    className="flex items-center justify-between cursor-pointer py-2"
                  >
                    <span className="font-medium">
                      {city.name} - {city.state}
                    </span>
                    {city.is_pilot && (
                      <span className="text-[10px] bg-red-100 text-[#E63239] font-bold px-1.5 py-0.5 rounded">
                        Piloto
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Endereço de entrega (estrutura v0.1) */}
          <div className="flex items-center gap-2 truncate">
            <span className="text-white/70 hidden md:inline">Entregar em:</span>
            <button
              onClick={() => {
                const novo = window.prompt(
                  'Informe o endereço/bairro para simulação de entrega em Óbidos:',
                  deliveryAddress,
                )
                if (novo) setDeliveryAddress(novo)
              }}
              className="text-white/90 hover:text-white underline underline-offset-2 truncate max-w-[220px] sm:max-w-xs text-left"
              title="Clique para alterar endereço de entrega"
            >
              {deliveryAddress}
            </button>
          </div>

          {/* Link para o Roadmap v0.1 -> v1.0 */}
          <Link
            to="/roadmap"
            className="hidden lg:flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded-full transition"
          >
            <Sparkles className="w-3 h-3 text-yellow-300" />
            <span>Roadmap do Projeto</span>
          </Link>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logotipo */}
        <Link to={`/${selectedCity?.slug || 'obidos'}`} className="focus:outline-none">
          <BoraliLogo size="md" showSlogan inverted />
        </Link>

        {/* Ações desktop */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botão Roadmap Mobile/Tablet */}
          <Link
            to="/roadmap"
            className="flex lg:hidden items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-md transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span className="hidden sm:inline">Roadmap</span>
          </Link>

          {/* Menu do Usuário / Auth */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/10 hover:text-white flex items-center gap-2 px-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-semibold leading-none">{user.name}</p>
                    <p className="text-[10px] text-white/70 capitalize mt-0.5">{user.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white text-slate-800 shadow-xl">
                <DropdownMenuLabel>
                  <p className="font-semibold text-sm">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-[#1754AE] px-1.5 py-0.5 rounded">
                    Perfil: {user.role}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                    <ShieldCheck className="w-4 h-4 mr-2 text-[#1754AE]" />
                    <span>Painel Administrativo</span>
                  </DropdownMenuItem>
                )}

                {(isMerchant || isAdmin) && (
                  <DropdownMenuItem
                    onClick={() => navigate('/painel-lojista')}
                    className="cursor-pointer"
                  >
                    <Store className="w-4 h-4 mr-2 text-emerald-600" />
                    <span>Painel do Comerciante</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => navigate('/perfil')} className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  <span>Meus Dados</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout()
                    navigate(`/${selectedCity?.slug || 'obidos'}`)
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Sair da conta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className="text-white hover:bg-white/10 hover:text-white text-xs font-medium"
              >
                <User className="w-4 h-4 mr-1.5" />
                <span>Entrar</span>
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/login?tab=register')}
                className="bg-[#E63239] hover:bg-[#c9242a] text-white text-xs font-semibold shadow-sm"
              >
                Cadastre-se
              </Button>
            </div>
          )}

          {/* Carrinho flutuante no desktop */}
          <Link
            to="/carrinho"
            className="hidden sm:flex items-center gap-2 bg-white text-[#1754AE] font-semibold px-3 py-1.5 rounded-full shadow hover:bg-slate-100 transition"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4" />
              {totalCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#E63239] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalCount}
                </span>
              )}
            </div>
            <span className="text-xs">
              {totalCount > 0 ? `R$ ${totalAmount.toFixed(2).replace('.', ',')}` : 'Carrinho'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
