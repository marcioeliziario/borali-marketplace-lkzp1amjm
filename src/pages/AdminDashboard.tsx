import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Building,
  Store,
  Layers,
  Users,
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAllCitiesAdmin,
  getAllStoresAdmin,
  getAllCategoriesAdmin,
  getAuditLogs,
  updateStore,
  updateCity,
  logAudit,
} from '@/services/api'
import { City, Store as StoreType, Category, AuditLog } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { getCityStatus, canOrderInCity } from '@/services/api'
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select'
import pb from '@/lib/pocketbase/client'

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [cities, setCities] = useState<City[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingCity, setEditingCity] = useState<City | null>(null)
  const [isCityModalOpen, setIsCityModalOpen] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      navigate('/login')
      return
    }

    async function loadAdminData() {
      setIsLoading(true)
      const [c, s, cat, logs] = await Promise.all([
        getAllCitiesAdmin(),
        getAllStoresAdmin(),
        getAllCategoriesAdmin(),
        getAuditLogs(),
      ])

      setCities(c)
      setStores(s)
      setCategories(cat)
      setAuditLogs(logs)
      setIsLoading(false)
    }

    loadAdminData()
  }, [isAdmin, navigate])

  // Aprovar ou suspender estabelecimento
  const handleToggleStoreStatus = async (store: StoreType, newStatus: 'approved' | 'suspended') => {
    try {
      const updated = await updateStore(store.id, {
        status: newStatus,
        is_active: newStatus === 'approved',
      })
      setStores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      logAudit(`store.${newStatus}`, 'stores', store.id, { store_name: store.name })
      toast({
        title: `Estabelecimento ${newStatus === 'approved' ? 'aprovado' : 'suspenso'}!`,
        description: `${store.name} foi atualizado com sucesso.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err?.message,
      })
    }
  }

  const handleSaveCity = async () => {
    if (!editingCity) return
    try {
      await updateCity(editingCity.id, { status: editingCity.status })
      setCities(cities.map((c) => (c.id === editingCity.id ? editingCity : c)))
      closeCityModal()
      toast({
        title: 'Cidade atualizada',
        description: 'O status da cidade foi alterado com sucesso.',
      })
      await loadData()
    } catch (err) {
      toast({
        title: 'Erro ao atualizar cidade',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      })
    }
  }

  const openCityModal = (city: City) => {
    setEditingCity({ ...city })
    setIsCityModalOpen(true)
  }

  const closeCityModal = () => {
    setEditingCity(null)
    setIsCityModalOpen(false)
  }

  const cityStatusLabel = (status: string) => {
    switch (status) {
      case 'preparation':
        return 'Em preparação'
      case 'onboarding':
        return 'Em cadastro'
      case 'active':
        return 'Operacional'
      case 'suspended':
        return 'Suspensa'
      default:
        return status || 'Desconhecido'
    }
  }

  const cityStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'onboarding':
        return 'secondary'
      case 'preparation':
        return 'outline'
      case 'suspended':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-[#1754AE] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Carregando painel administrativo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* CABEÇALHO */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1754AE] flex items-center justify-center border border-blue-100 flex-shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Administração Geral Borali</h1>
                <Badge className="bg-blue-100 text-[#1754AE] border-blue-200 text-xs font-bold">
                  v0.1 FUNDAÇÃO
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle central da plataforma multicidade e multiempresa • Primeira cidade:
                Óbidos/PA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/obidos')}
              className="text-xs"
            >
              Ver Marketplace
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/roadmap')}
              className="bg-[#1754AE] text-white text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-yellow-300" />
              Documentação Roadmap
            </Button>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Cidades Cadastradas</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{cities.length}</h3>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  Óbidos (Piloto ativo)
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1754AE] flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Estabelecimentos</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stores.length}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Piloto Distribuidora + Mercadinho
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Categorias Ativas</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{categories.length}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">19 categorias da especificação</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Registros de Auditoria</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{auditLogs.length}</h3>
                <p className="text-[10px] text-purple-600 font-medium mt-0.5">
                  LGPD e rastreabilidade
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ABAS DO ADMIN */}
        <Tabs defaultValue="stores" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm mb-6">
            <TabsTrigger value="stores" className="text-xs font-semibold px-4 py-2">
              <Store className="w-4 h-4 mr-1.5" />
              Estabelecimentos & Aprovação
            </TabsTrigger>
            <TabsTrigger value="cities" className="text-xs font-semibold px-4 py-2">
              <Building className="w-4 h-4 mr-1.5" />
              Cidades
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs font-semibold px-4 py-2">
              <Layers className="w-4 h-4 mr-1.5" />
              Categorias ({categories.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs font-semibold px-4 py-2">
              <FileText className="w-4 h-4 mr-1.5" />
              Auditoria & Segurança
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ESTABELECIMENTOS */}
          <TabsContent value="stores" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Estabelecimentos Cadastrados</h3>
                <p className="text-xs text-slate-500">
                  Aprovação de lojistas, controle de ativação e isolamento comercial
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Estabelecimento</th>
                      <th className="p-4">Cidade</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Taxa / Pedido Mín</th>
                      <th className="p-4">Contato</th>
                      <th className="p-4 text-right">Aprovação / Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stores.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-400">/{s.slug}</div>
                          {s.is_demo && (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-red-50 text-red-700 border-red-200 font-bold mt-0.5"
                            >
                              PILOTO DEMO
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-slate-700">Óbidos - PA</span>
                        </td>
                        <td className="p-4">
                          <Badge
                            className={`text-xs ${
                              s.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {s.status === 'approved' ? 'Aprovada e Ativa' : s.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-800">
                            R${' '}
                            {Number(s.delivery_fee || 0)
                              .toFixed(2)
                              .replace('.', ',')}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Mín: R${' '}
                            {Number(s.min_order_value || 0)
                              .toFixed(2)
                              .replace('.', ',')}
                          </p>
                        </td>
                        <td className="p-4 text-slate-600 font-mono text-[11px]">
                          {s.whatsapp || s.phone || '-'}
                        </td>
                        <td className="p-4 text-right space-x-1">
                          {s.status === 'approved' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStoreStatus(s, 'suspended')}
                              className="text-xs text-amber-700 hover:text-amber-800"
                            >
                              Suspender
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleToggleStoreStatus(s, 'approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            >
                              Aprovar Loja
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/obidos/${s.slug}`)}
                            className="text-xs text-[#1754AE]"
                          >
                            Ver Loja
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: CIDADES */}
          <TabsContent value="cities" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Cidades do Marketplace</h3>
                <p className="text-xs text-slate-500">
                  Arquitetura multicidade preparada para expansão regional
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cities.map((city) => (
                <Card key={city.id} className="border-slate-200 bg-white">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#E63239]" />
                        <h4 className="font-bold text-base text-slate-900">
                          {city.name} - {city.state}
                        </h4>
                      </div>
                      {city.is_pilot && (
                        <Badge className="bg-red-100 text-[#E63239] border border-red-200 font-bold text-[10px]">
                          CIDADE PILOTO
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Slug de rota:{' '}
                      <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">
                        /{city.slug}
                      </code>
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>Status: {cityStatusLabel(city.status || 'active')}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCityModal(city)}
                        className="text-xs"
                      >
                        Gerenciar Status
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: CATEGORIAS */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Categorias Comerciais Cadastradas ({categories.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Todas as 19 categorias iniciais da especificação ativas e configuráveis por cidade
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      #{idx + 1} • {cat.slug}
                    </span>
                    <h5 className="font-bold text-xs text-slate-800">{cat.name}</h5>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                  >
                    Ativa
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 4: AUDITORIA */}
          <TabsContent value="audit" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Trilha de Auditoria & LGPD</h3>
                <p className="text-xs text-slate-500">
                  Registro cronológico de acessos, alterações e cadastros do sistema
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Ação</th>
                      <th className="p-3">Usuário</th>
                      <th className="p-3">Função</th>
                      <th className="p-3">Recurso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          Nenhum evento registrado ainda. As ações administrativas e logins serão
                          gravados aqui.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-slate-500 text-[11px]">
                            {log.created ? new Date(log.created).toLocaleString('pt-BR') : '-'}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{log.action}</td>
                          <td className="p-3 text-slate-600">{log.user_email || 'Sistema'}</td>
                          <td className="p-3">
                            <Badge variant="secondary" className="text-[10px]">
                              {log.user_role || 'anônimo'}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-slate-500 text-[11px]">
                            {log.resource}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Edição de Cidade */}
      <Dialog open={isCityModalOpen} onOpenChange={setIsCityModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Gerenciar Status da Cidade
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingCity?.name} - {editingCity?.state}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status da Cidade</Label>
              <Select
                value={editingCity?.status || 'active'}
                onValueChange={(value) =>
                  setEditingCity((prev) => (prev ? { ...prev, status: value as any } : prev))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparation">Em preparação</SelectItem>
                  <SelectItem value="onboarding">Em cadastro</SelectItem>
                  <SelectItem value="active">Operacional</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-[11px] text-slate-500 bg-blue-50 border border-blue-200 rounded-lg p-2">
              <strong>Observação:</strong> Cidades em "Em preparação" ou "Em cadastro" são visíveis
              ao público, mas não aceitam pedidos. Somente cidades "Operacionais" podem receber
              novos pedidos.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeCityModal}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveCity} className="bg-[#1754AE] hover:bg-[#12428C]">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminDashboard
