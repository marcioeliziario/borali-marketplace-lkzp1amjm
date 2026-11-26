import React from 'react'

interface ProductCardProps {
  title: string
  price: string
  image?: string
  disabled?: boolean
}

export default function ProductCard({ title, price, image, disabled }: ProductCardProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${disabled ? 'opacity-70' : ''}`}>
      <div className="aspect-square bg-slate-100 relative">
        {image && <img src={image} alt={title} className="w-full h-full object-cover" />}
        {disabled && (
          <span className="absolute top-2 right-2 text-[10px] bg-slate-800/80 text-white px-2 py-0.5 rounded-full">
            Demo
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">{title}</h3>
        <p className="text-base font-bold text-[#E63239]">{price}</p>
      </div>
    </div>
  )
}