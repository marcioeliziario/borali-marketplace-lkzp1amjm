import React, { createContext, useContext, useState, useEffect } from 'react'
import { City } from '@/types'
import { getCities } from '@/services/api'

interface CityContextType {
  cities: City[]
  selectedCity: City | null
  setSelectedCity: (city: City) => void
  selectCityBySlug: (slug: string) => City | null
  isLoading: boolean
}

const CityContext = createContext<CityContextType | undefined>(undefined)

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCityState] = useState<City | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const data = await getCities()
      setCities(data)

      // Cidade padrão: Óbidos ou primeira da lista
      const savedSlug = localStorage.getItem('borali_selected_city')
      let initialCity = data.find((c) => c.slug === savedSlug)
      if (!initialCity) {
        initialCity = data.find((c) => c.slug === 'obidos') || data[0] || null
      }
      setSelectedCityState(initialCity)
      setIsLoading(false)
    }
    load()
  }, [])

  const setSelectedCity = (city: City) => {
    setSelectedCityState(city)
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
