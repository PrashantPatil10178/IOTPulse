"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

export const AVAILABLE_LANGUAGES = [
  { id: "en", name: "English" },
  { id: "hi", name: "Hindi" },
  { id: "mr", name: "Marathi" },
  { id: "te", name: "Telugu" },
  { id: "gu", name: "Gujarati" },
]

interface LanguageContextType {
  language: string
  changeLanguage: (lang: string) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState("en")

  const changeLanguage = (lang: string) => {
    setLanguage(lang)
  }

  const t = (key: string) => {
    // Simple translation function - in a real app, you'd have translation files
    return key
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
