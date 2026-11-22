import React from 'react'
import { Link } from 'react-router-dom'
import { BoraliLogo } from '@/components/brand/BoraliLogo'
import { ShieldCheck, MapPin, Sparkles, Heart } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-10 pb-20 md:pb-10 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Coluna 1: Borali & Slogan */}
        <div className="space-y-3 md:col-span-1">
          <BoraliLogo size="md" inverted showSlogan />
          <p className="text-xs text-slate-400 leading-relaxed pt-2">
            Plataforma multicidade e multiempresa para a digitalização do comércio local. Primeira
            cidade de atuação: <strong className="text-white">Óbidos, Pará</strong>.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
            <MapPin className="w-4 h-4 text-[#E63239]" />
            <span>Amazônia, Brasil</span>
          </div>
        </div>

        {/* Coluna 2: Navegação */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">
            Navegação
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/obidos" className="hover:text-white transition">
                Início (Óbidos)
              </Link>
            </li>
            <li>
              <Link to="/obidos/distribuidora-barbosa" className="hover:text-white transition">
                Distribuidora Barbosa (Piloto)
              </Link>
            </li>
            <li>
              <Link to="/obidos/mercadinho" className="hover:text-white transition">
                Mercadinho (Piloto)
              </Link>
            </li>
            <li>
              <Link to="/roadmap" className="hover:text-white transition flex items-center gap-1">
                <span>Roadmap do Projeto</span>
                <span className="text-[9px] bg-red-600 text-white px-1 rounded">v0.2</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Coluna 3: Acessos por Função */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">
            Acesso ao Sistema
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/login" className="hover:text-white transition">
                Acessar minha conta
              </Link>
            </li>
            <li>
              <Link to="/painel-lojista" className="hover:text-white transition">
                Portal do Comerciante
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-white transition">
                Administração Geral
              </Link>
            </li>
            <li>
              <span className="text-slate-500 cursor-not-allowed">Portal do Entregador (v0.4)</span>
            </li>
          </ul>
        </div>

        {/* Coluna 4: Segurança & LGPD */}
        <div className="space-y-2.5">
          <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Segurança & LGPD</span>
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Seus dados são protegidos em conformidade com a LGPD. Isolamento comercial estrito entre
            estabelecimentos.
          </p>
          <div className="p-2.5 bg-slate-800/80 rounded-md border border-slate-700 text-[11px] text-slate-300">
            <strong className="text-white block mb-0.5">Versão Atual: v0.2</strong>
            Catálogo completo, painel do lojista em seções, promoções com período e ações em lote.
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Borali Marketplace. Todos os direitos reservados.</p>
        <p className="flex items-center gap-1">
          Feito com orgulho para Óbidos/PA
          <Heart className="w-3.5 h-3.5 text-[#E63239] fill-[#E63239]" />
        </p>
      </div>
    </footer>
  )
}

export default Footer
