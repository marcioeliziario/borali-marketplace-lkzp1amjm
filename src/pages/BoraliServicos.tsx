import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Search, ArrowLeft, Briefcase, Star, MapPin, Phone } from 'lucide-react'

const serviceCategories = [
  { name: 'Eletricista', icon: '⚡' },
  { name: 'Encanador', icon: '🔧' },
  { name: 'Diarista', icon: '🧹' },
  { name: 'Pintor', icon: '🎨' },
  { name: 'Marceneiro', icon: '🪚' },
  { name: 'Pedreiro', icon: '🧱' },
  { name: 'Jardineiro', icon: '🌿' },
  { name: 'Técnico em informática', icon: '💻' },
]

const professionals = [
  {
    id: 'joao-eletricista',
    name: 'João da Silva',
    specialty: 'Eletricista',
    rating: 4.8,
    city: 'Óbidos',
    description: 'Instalações elétricas residenciais e comerciais com mais de 10 anos de experiência.',
    tags: ['Residencial', 'Comercial'],
    isFictitious: true,
  },
  {
    id: 'maria-diarista',
    name: 'Maria Oliveira',
    specialty: 'Diarista',
    rating: 4.6,
    city: 'Óbidos',
    description: 'Limpeza residencial e organização de ambientes.',
    tags: ['Residencial'],
    isFictitious: true,
  },
  {
    id: 'pedro-encanador',
    name: 'Pedro Santos',
    specialty: 'Encanador',
    rating: 4.7,
    city: 'Óbidos',
    description: 'Reparos hidráulicos, instalação de registros e caixas d\'água.',
    tags: ['Residencial', 'Comercial'],
    isFictitious: true,
  },
]

export default function BoraliServicos() {
  const { citySlug } = useParams()
  const [query, setQuery] = useState('')
  const cityLabel = citySlug ? citySlug.charAt(0).toUpperCase() + citySlug.slice(1) : 'Cidade'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header com busca */}
      <div className="bg-[#1754AE] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link to={`/${citySlug}`} className="p-1 hover:bg-white/10 rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Borali Serviços • {cityLabel}</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar serviços ou profissionais..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E63239]"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Categorias de serviços */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Categorias</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {serviceCategories.map((cat) => (
              <button
                key={cat.name}
                className="flex flex-col items-center gap-1 min-w-[80px] bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-[#1754AE]/40 transition"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium text-slate-700">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Perfis profissionais (demonstrativos) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">Profissionais</h2>
            <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
              Perfis demonstrativos
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Os perfis abaixo são fictícios e servem para demonstração da interface. Nenhum contato real está disponível.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {professionals.map((pro) => (
              <div
                key={pro.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#1754AE]/10 flex items-center justify-center text-lg font-bold text-[#1754AE]">
                    {pro.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{pro.name}</h3>
                    <p className="text-xs text-slate-500">{pro.specialty} • {pro.city}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3">{pro.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {pro.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{pro.rating}</span>
                  <span>• Demonstração</span>
                </div>
                <button className="w-full py-2 rounded-lg bg-[#1754AE] text-white text-sm font-semibold opacity-60 cursor-not-allowed">
                  Solicitar orçamento (em breve)
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
