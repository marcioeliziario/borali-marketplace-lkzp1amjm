import React from 'react'

export default function OfferBanner() {
  return (
    <div className="bg-gradient-to-r from-[#E63239] to-[#c9242a] text-white rounded-2xl p-6 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">Oferta do dia</span>
          <h3 className="text-xl font-bold mt-2">Café Torrado 500g</h3>
          <p className="text-sm opacity-90 mt-1">De R$ 22,90 por apenas</p>
          <p className="text-3xl font-black mt-1">R$ 18,90</p>
        </div>
        <div className="text-right">
          <span className="text-4xl">☕</span>
        </div>
      </div>
      <p className="text-xs mt-4 opacity-80">* Preço demonstrativo. Não é possível realizar compras reais neste momento.</p>
    </div>
  )
}