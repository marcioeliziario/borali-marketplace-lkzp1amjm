import React from 'react'
import {
  Store,
  Wine,
  Pill,
  Utensils,
  Beef,
  Fish,
  Apple,
  Croissant,
  IceCream,
  Flame,
  Dog,
  Sparkles,
  Wheat,
  Shirt,
  Hammer,
  Bike,
  BookOpen,
  Home,
  Gift,
  Tag,
} from 'lucide-react'

interface CategoryIconProps {
  slug?: string
  iconName?: string
  className?: string
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  slug,
  iconName,
  className = 'w-5 h-5',
}) => {
  const normalized = (slug || iconName || '').toLowerCase()

  if (normalized.includes('mercado') || normalized === 'store') {
    return <Store className={className} />
  }
  if (normalized.includes('bebida') || normalized === 'wine') {
    return <Wine className={className} />
  }
  if (normalized.includes('farmacia') || normalized === 'pill') {
    return <Pill className={className} />
  }
  if (
    normalized.includes('restaurante') ||
    normalized.includes('lanche') ||
    normalized === 'utensils'
  ) {
    return <Utensils className={className} />
  }
  if (normalized.includes('acougue') || normalized === 'beef') {
    return <Beef className={className} />
  }
  if (normalized.includes('peix') || normalized === 'fish') {
    return <Fish className={className} />
  }
  if (normalized.includes('fruta') || normalized.includes('verdura') || normalized === 'apple') {
    return <Apple className={className} />
  }
  if (normalized.includes('padaria') || normalized === 'croissant') {
    return <Croissant className={className} />
  }
  if (normalized.includes('acai') || normalized.includes('sorvete') || normalized === 'icecream') {
    return <IceCream className={className} />
  }
  if (normalized.includes('gas') || normalized.includes('agua') || normalized === 'flame') {
    return <Flame className={className} />
  }
  if (normalized.includes('pet') || normalized === 'dog') {
    return <Dog className={className} />
  }
  if (
    normalized.includes('beleza') ||
    normalized.includes('perfumaria') ||
    normalized === 'sparkles'
  ) {
    return <Sparkles className={className} />
  }
  if (normalized.includes('sabores') || normalized.includes('terra') || normalized === 'wheat') {
    return <Wheat className={className} />
  }
  if (normalized.includes('moda') || normalized.includes('calcado') || normalized === 'shirt') {
    return <Shirt className={className} />
  }
  if (
    normalized.includes('construcao') ||
    normalized.includes('ferramenta') ||
    normalized === 'hammer'
  ) {
    return <Hammer className={className} />
  }
  if (normalized.includes('moto') || normalized === 'bike') {
    return <Bike className={className} />
  }
  if (normalized.includes('papelaria') || normalized === 'bookopen') {
    return <BookOpen className={className} />
  }
  if (normalized.includes('casa') || normalized.includes('utilidade') || normalized === 'home') {
    return <Home className={className} />
  }
  if (normalized.includes('presente') || normalized.includes('festa') || normalized === 'gift') {
    return <Gift className={className} />
  }

  return <Tag className={className} />
}

export default CategoryIcon
