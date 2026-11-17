import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { BoraliLogo } from '@/components/brand/BoraliLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, ShieldCheck, CheckCircle2, Lock, ArrowRight } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { logAudit } from '@/services/api'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user } = useAuth()

  const queryParams = new URLSearchParams(location.search)
  const defaultTab = queryParams.get('tab') === 'register' ? 'register' : 'login'

  const [activeTab, setActiveTab] = useState(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Campos de Cadastro de Cliente (v0.1 estruturado)
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [lgpdConsent, setLgpdConsent] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const res = await login(email, password)
    setIsLoading(false)

    if (res.success) {
      logAudit('auth.login', 'users', '', { email })
      // Redirecionamento baseado no papel
      const currentUser = pb.authStore.model
      if (currentUser?.role === 'admin') {
        navigate('/admin')
      } else if (currentUser?.role === 'merchant') {
        navigate('/painel-lojista')
      } else {
        navigate('/obidos')
      }
    } else {
      setError(res.error || 'Credenciais inválidas.')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!lgpdConsent) {
      setError('É necessário concordar com a política de privacidade e LGPD para se cadastrar.')
      return
    }

    if (regPassword.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setIsLoading(true)
    try {
      // Criação de cliente comum: NÃO permitir que o usuário defina role administrativa
      await pb.collection('users').create({
        email: regEmail,
        password: regPassword,
        passwordConfirm: regPassword,
        name: regName,
        phone: regPhone,
        role: 'customer', // Estritamente 'customer'
      })

      logAudit('auth.register_customer', 'users', '', { email: regEmail })
      setRegSuccess(true)
      setIsLoading(false)

      // Login automático
      await login(regEmail, regPassword)
      setTimeout(() => {
        navigate('/obidos')
      }, 1500)
    } catch (err: any) {
      setIsLoading(false)
      setError(err?.message || 'Falha ao criar conta. Verifique os dados.')
    }
  }

  // Atalho de demonstração rápida para os avaliadores
  const fillCredentials = (type: 'admin' | 'merchant') => {
    if (type === 'admin') {
      setEmail('marcio.eliziario@hotmail.com')
      setPassword('Skip@Pass')
    } else {
      setEmail('comerciante.barbosa@borali.local')
      setPassword('Skip@Pass')
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 px-4">
        <div className="flex justify-center">
          <BoraliLogo size="lg" showSlogan />
        </div>
        <p className="text-xs text-slate-500">
          Acesse sua conta ou cadastre-se para aproveitar os melhores comércios de Óbidos/PA.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full rounded-none border-b border-slate-200 bg-slate-50 p-1">
              <TabsTrigger value="login" className="text-xs font-semibold py-2">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" className="text-xs font-semibold py-2">
                Criar Conta (Cliente)
              </TabsTrigger>
            </TabsList>

            {/* ABA DE LOGIN */}
            <TabsContent value="login" className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                      Senha
                    </Label>
                    <span className="text-[11px] text-[#1754AE] hover:underline cursor-pointer">
                      Esqueceu a senha?
                    </span>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-xs h-10"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1754AE] hover:bg-[#12428C] text-white font-bold text-xs h-10 rounded-xl"
                >
                  {isLoading ? 'Autenticando...' : 'Acessar Plataforma'}
                </Button>
              </form>

              {/* ATALHO DEMO PARA TESTADORES */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Contas de Demonstração (v0.1):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillCredentials('admin')}
                    className="text-[11px] text-slate-700 h-8"
                  >
                    Entrar como Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillCredentials('merchant')}
                    className="text-[11px] text-slate-700 h-8"
                  >
                    Entrar como Lojista
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ABA DE CADASTRO DE CLIENTE */}
            <TabsContent value="register" className="p-6 space-y-4">
              {regSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-900 text-sm">Conta criada com sucesso!</h4>
                  <p className="text-xs text-emerald-700">
                    Redirecionando você para o marketplace de Óbidos...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="regName" className="text-xs font-semibold text-slate-700">
                      Nome completo
                    </Label>
                    <Input
                      id="regName"
                      type="text"
                      required
                      placeholder="Seu nome"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="regEmail" className="text-xs font-semibold text-slate-700">
                      E-mail
                    </Label>
                    <Input
                      id="regEmail"
                      type="email"
                      required
                      placeholder="seuemail@exemplo.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="regPhone" className="text-xs font-semibold text-slate-700">
                      WhatsApp / Telefone
                    </Label>
                    <Input
                      id="regPhone"
                      type="tel"
                      placeholder="(93) 98100-0000"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="regPassword" className="text-xs font-semibold text-slate-700">
                      Senha (mínimo 8 caracteres)
                    </Label>
                    <Input
                      id="regPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Consentimento LGPD */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lgpdConsent}
                        onChange={(e) => setLgpdConsent(e.target.checked)}
                        className="mt-0.5 rounded text-[#1754AE]"
                      />
                      <span>
                        Concordo com a coleta e tratamento dos meus dados conforme a LGPD e termos
                        de uso da Borali para entregas e comunicação de pedidos.
                      </span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#E63239] hover:bg-[#c9242a] text-white font-bold text-xs h-10 rounded-xl"
                  >
                    {isLoading ? 'Cadastrando...' : 'Criar minha conta'}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Nota de Segurança Administrativa */}
        <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1754AE] flex-shrink-0 mt-0.5" />
          <span>
            <strong>Segurança da Plataforma:</strong> Cadastros administrativos e de comerciantes
            não são abertos ao público. Eles são criados e aprovados exclusivamente pela
            administração geral.
          </span>
        </div>
      </div>
    </div>
  )
}

export default Login
