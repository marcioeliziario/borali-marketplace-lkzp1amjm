import React, { createContext, useContext, useState, useEffect } from 'react'
import { City } from '@/types'
import { getCities, canOrderInCity } from '@/services/api'

interface CityContextType {
  cities: City[]
  selectedCity: City | null
  setSelectedCity: (city: City) => void
  selectCityBySlug: (slug: string) => City | null
  isLoading: boolean
  cityCanOrder: boolean
}

const CityContext = createContext<CityContextType | undefined>(undefined)

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCityState] = useState<City | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cityCanOrder, setCityCanOrder] = useState(false)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const data = await getCities()
      setCities(data)

      // Se houver cidade selecionada, verificar se permite pedidos
      const savedSlug = localStorage.getItem('borali_selected_city')
      let initialCity = data.find((c) => c.slug === savedSlug)
      if (!initialCity) {
        initialCity = data.find((c) => c.slug === 'obidos') || data[0] || null
      }

      // Atualizar estado de habilitação de pedidos
      if (initialCity) {
        setCityCanOrder(canOrderInCity(initialCity.status))
      }

      setSelectedCityState(initialCity)
      setIsLoading(false)
    }
    load()
  }, [])

  const setSelectedCity = (city: City) => {
    setSelectedCityState(city)
    setCityCanOrder(canOrderInCity(city.status))
    localStorage.setItem('borali_selected_city', city.slug)
  }

  const selectCityBySlug = (slug: string): City | null => {
    const found = cities.find((c) => c.slug.toLowerCase() === slug.toLowerCase())
    if (found) {
      setSelectedCity(found)
      return found
    }
    return null
  }

  return (
    <CityContext.Provider
      value={{
        cities,
        selectedCity,
        setSelectedCity,
        selectCityBySlug,
        isLoading,
        cityCanOrder,
      }}
    >
      {children}
    </CityContext.Provider>
  )
}

export const useCity = () => {
  const context = useContext(CityContext)
  if (!context) {
    throw new Error('useCity must be used within a CityProvider')
  }
  return context
}
