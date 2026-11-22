import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, ShieldCheck, Store, LogOut, Mail, Phone, MapPin } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const ProfilePage: React.FC = () => {
  const { user, logout, isAdmin, isMerchant } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-sm shadow-sm space-y-4">
          <User className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Acesse sua conta</h2>
          <p className="text-xs text-slate-500">
            Entre ou cadastre-se para gerenciar seus dados e pedidos na Borali.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="bg-[#1754AE] text-white text-xs w-full"
          >
            Fazer Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-8 px-4 pb-24">
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1754AE] text-white flex items-center justify-center font-bold text-lg">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">{user.name}</CardTitle>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-[#1754AE] border-blue-200 uppercase text-[10px] font-bold">
                {user.role}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Óbidos, Pará (Piloto Borali)</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              {isAdmin && (
                <Button
                  onClick={() => navigate('/admin')}
                  className="w-full bg-[#1754AE] text-white text-xs font-semibold justify-start"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Painel de Administração Geral
                </Button>
              )}

              {(isMerchant || isAdmin) && (
                <Button
                  onClick={() => navigate('/painel-lojista')}
                  variant="outline"
                  className="w-full text-xs font-semibold justify-start border-slate-200"
                >
                  <Store className="w-4 h-4 mr-2 text-emerald-600" />
                  Painel do Comerciante
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  logout()
                  navigate('/obidos')
                }}
                className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 justify-start"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair da conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ProfilePage
