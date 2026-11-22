import React from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Store,
  MapPin,
  Cpu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BoraliLogo } from '@/components/brand/BoraliLogo'

export const RoadmapPage: React.FC = () => {
  const versions = [
    {
      version: 'v0.1',
      title: 'Fundação & Identidade Visual',
      status: 'completed',
      tag: 'Entregue na Rodada 1',
      date: 'Novembro / 2026',
      description:
        'Criação da arquitetura multicidade e multiempresa, schema de banco de dados, autenticação com 4 perfis, 19 categorias comerciais, página inicial do marketplace, lojas virtuais piloto (Distribuidora Barbosa e Mercadinho em Óbidos/PA) com dados demonstrativos claramente identificados, painel administrativo geral e estrutura inicial do comerciante.',
      items: [
        'Identidade visual inspirada na bandeira de Óbidos (#1754AE e #E63239)',
        'Logotipo SVG e favicon próprios, tipografia moderna e PWA instalável',
        'Modelagem das coleções: cities, categories, stores, products, orders, audit_log, users',
        'Cadastro da cidade piloto Óbidos/PA e 19 categorias comerciais',
        'Dois estabelecimentos piloto com dados demonstrativos [DEMO]',
        'URLs amigáveis /cidade/estabelecimento (ex: /obidos/distribuidora-barbosa)',
        'Painel administrativo completo com aprovação de lojas e auditoria',
        'Painel do comerciante com cadastro e edição de produtos e estoque',
        'Isolamento estrito entre dados comerciais de estabelecimentos',
      ],
    },
    {
      version: 'v0.2',
      title: 'Catálogo Completo & Gestão Avançada de Produtos',
      status: 'completed',
      tag: 'Entregue na Rodada 2',
      date: 'Novembro / 2026',
      description:
        'Catálogo completo com painel do lojista em seções (informações, fotografias, preços e promoções com período validado, estoque e disponibilidade, variações e complementos), ações em lote com exportação/importação de CSV, histórico de movimentações de estoque e correção da exibição de promoções vencidas no catálogo público.',
      items: [
        'Util central de promoções: preço riscado e % só quando a promoção está vigente',
        'Painel do lojista em seções com persistência real no PocketBase',
        'Upload de múltiplas fotos por produto, foto principal e reordenação',
        'Variações de tamanho/volume com preço e estoque independentes',
        'Complementos e adicionais com grupos obrigatórios/opcionais e preço',
        'Estoque: histórico de movimentações, ajuste manual e alerta de estoque baixo',
        'Ações em lote (arquivar, duplicar, ativar/desativar) com auditoria server-side',
        'Exportação e importação de catálogo em CSV com pré-visualização e validação',
        'Loja virtual com busca, filtros (categoria, preço, disponibilidade, só promoções) e ordenação',
        'Detalhe do produto com variações e complementos antes de adicionar ao carrinho',
        'Regulamentação legal ativa para produtos com restrição de idade',
        'Usuário de teste do Mercadinho + teste de isolamento entre estabelecimentos (scripts/test-isolamento.ts)',
        'Auditoria server-side (audit_log) em criação, atualização, exclusão e movimentação de estoque',
      ],
    },
    {
      version: 'v0.3',
      title: 'Carrinho Persistente & Gestão de Pedidos',
      status: 'planned',
      tag: 'Planejado',
      date: 'Planejado',
      description:
        'Fluxo interativo de checkout e confirmação de pedidos. O cliente fecha pedidos na loja de sua preferência com cálculo automático de taxa de entrega e envio do pedido direto ao painel do comerciante.',
      items: [
        'Fluxo de checkout interativo e finalização de compras',
        'Painel de pedidos em tempo real no comerciante com alertas sonoros',
        'Atualização de status do pedido com linha do tempo para o cliente',
        'Cancelamento com justificativa e histórico imutável de valores',
        'Impressão de comanda térmica para preparação de balcão',
      ],
    },
    {
      version: 'v0.4',
      title: 'Pagamentos & Entregas',
      status: 'planned',
      tag: 'Planejado',
      date: 'Planejado',
      description:
        'Integração de pagamentos (Pix automático via QR code dinâmico, dinheiro com troco e maquininha no ato da entrega) e módulo de entregadores com confirmação de retirada e entrega.',
      items: [
        'Cobrança instantânea por Pix com conciliação automática',
        'Opções de pagamento na entrega (dinheiro com troco e maquininha)',
        'Portal do Entregador com rotas e confirmações digitais',
        'Taxas de entrega dinâmicas por bairro em Óbidos',
        'Rastreamento simplificado do entregador a caminho',
      ],
    },
    {
      version: 'v0.5',
      title: 'Gestão Financeira & Comissões',
      status: 'planned',
      tag: 'Planejado',
      date: 'Planejado',
      description:
        'Módulo financeiro da plataforma com divisão de pagamentos (split), controle de repasses, relatórios de faturamento por estabelecimento, comissões administrativas e faturamento da plataforma Borali.',
      items: [
        'Painel financeiro com gráficos de receita e conciliação',
        'Split automático de pagamentos e cálculo de comissões',
        'Extrato detalhado de vendas e repasses para lojistas',
        'Exportação de relatórios contábeis e fiscais em CSV/PDF',
      ],
    },
    {
      version: 'v0.6',
      title: 'Integração Oficial com WhatsApp',
      status: 'planned',
      tag: 'Planejado',
      date: 'Planejado',
      description:
        'Notificações automáticas aos clientes e comerciantes via WhatsApp (confirmação do pedido, status de entrega, recuperação de carrinhos abandonados e atendimento comercial integrado).',
      items: [
        'Disparo de mensagens transacionais de confirmação e entrega',
        'Notificação ao comerciante quando um novo pedido chega',
        'Recuperação de compras e suporte direto entre cliente e lojista',
      ],
    },
    {
      version: 'v1.0',
      title: 'Lançamento Oficial em Óbidos / PA',
      status: 'planned',
      tag: 'Marco Principal',
      date: 'Meta de Lançamento',
      description:
        'Lançamento comercial pleno da plataforma Borali em Óbidos, onboarding de dezenas de comerciantes locais em todas as 19 categorias, campanha publicitária na cidade e expansão planejada para municípios vizinhos.',
      items: [
        'Campanha de marketing e adesão com comerciantes obidenses',
        'Suporte técnico local e treinamento para lojistas e entregadores',
        'Plataforma 100% validada em ambiente de produção com alta disponibilidade',
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* CABEÇALHO */}
        <div className="text-center space-y-3">
          <Badge className="bg-[#1754AE] text-white text-xs px-3 py-1 font-bold">
            DOCUMENTAÇÃO TÉCNICA E ROADMAP
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Evolução do Marketplace <span className="text-[#1754AE]">BORALI</span>
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            "Sua cidade, mais perto de você". Documentação completa das fases do projeto,
            respeitando a restrição de implementar na <strong>v0.1</strong> estritamente o escopo da
            seção 15 sem antecipação prematura.
          </p>

          <div className="flex justify-center gap-3 pt-2">
            <Link to="/obidos">
              <Button size="sm" className="bg-[#1754AE] text-white text-xs font-semibold">
                Explorar Marketplace Óbidos
              </Button>
            </Link>
            <Link to="/admin">
              <Button size="sm" variant="outline" className="text-xs">
                Painel Administrativo
              </Button>
            </Link>
          </div>
        </div>

        {/* TIMELINE DO ROADMAP */}
        <div className="space-y-6">
          {versions.map((ver, idx) => {
            const isCompleted = ver.status === 'completed'
            return (
              <Card
                key={ver.version}
                className={`border transition-all duration-200 overflow-hidden ${
                  isCompleted
                    ? 'border-[#1754AE] bg-white shadow-md ring-1 ring-[#1754AE]/20'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                <div
                  className={`px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b ${
                    isCompleted
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-black text-lg px-2.5 py-1 rounded-lg ${
                        isCompleted
                          ? 'bg-[#1754AE] text-white shadow-sm'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ver.version}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{ver.title}</h3>
                      <p className="text-xs text-slate-500">{ver.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <Badge className="bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {ver.tag}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs text-slate-600 bg-white font-medium"
                      >
                        <Clock className="w-3 h-3 mr-1 text-slate-400" />
                        {ver.tag}
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {ver.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Entregáveis da Fase:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ver.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="flex items-start gap-2 text-xs text-slate-700"
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                              isCompleted ? 'bg-[#1754AE]' : 'bg-slate-300'
                            }`}
                          />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* NOTA DE CONFORMIDADE E ESPECIFICAÇÃO */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Conformidade com a Seção 15 do Documento de Especificação</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Esta versão <strong>v0.1</strong> contempla rigorosamente a fundação do sistema:
            arquitetura multicidade e multiempresa, isolamento de dados no backend PocketBase,
            autenticação por função, identidade visual própria inspirada na bandeira de Óbidos, as
            19 categorias comerciais, catálogo demonstrativo piloto [DEMO] na Distribuidora Barbosa
            e Mercadinho, e os painéis administrativo e do comerciante. Funcionalidades subsequentes
            (pedidos em tempo real, pagamentos, WhatsApp) serão incorporadas nas respectivas versões
            de acordo com este plano de trabalho.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RoadmapPage
