import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set) => ({
      userId: null,
      messages: [],
      isConnected: false,
      language: 'ua',
      theme: 'dark',

      setUserId: (id) => set({ userId: id }),
      setMessages: (messages) => set({ messages }),
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      setConnected: (v) => set({ isConnected: v }),
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'knome-store',
      partialize: (s) => ({ userId: s.userId, language: s.language, theme: s.theme }),
    }
  )
)
