import React from 'react'

interface StoreCardProps {
  store: {
    name: string
    description: string
    category: string
    image?: string
  }
}

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
      <div className="h-32 bg-slate-100 relative">
        {store.image && <img src={store.image} alt={store.name} className="w-full h-full object-cover" />}
      </div>
      <div className="p-4">
        <span className="text-xs text-[#1754AE] font-semibold">{store.category}</span>
        <h3 className="text-lg font-bold text-slate-900 mt-1">{store.name}</h3>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{store.description}</p>
      </div>
    </div>
  )
}