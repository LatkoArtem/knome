import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set) => ({
      userId: null,
      token: null,
      userEmail: null,
      userName: null,
      messages: [],
      isConnected: false,
      isLoading: false,
      streamingContent: '',
      language: 'ua',
      theme: 'dark',

      setUserId: (id) => set({ userId: id }),
      setAuth: ({ user_id, token, email, name }) => set({ userId: user_id, token, userEmail: email, userName: name }),
      logout: () => set({ userId: null, token: null, userEmail: null, userName: null, messages: [] }),
      setMessages: (messages) => set({ messages }),
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      setConnected: (v) => set({ isConnected: v }),
      setLoading: (v) => set({ isLoading: v }),
      appendToStream: (token) => set((s) => ({ streamingContent: s.streamingContent + token, isLoading: false })),
      finalizeStream: () => set((s) => ({
        messages: s.streamingContent
          ? [...s.messages, { role: 'assistant', content: s.streamingContent, ts: Date.now() }]
          : s.messages,
        streamingContent: '',
        isLoading: false,
      })),
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'knome-store',
      partialize: (s) => ({ userId: s.userId, token: s.token, userEmail: s.userEmail, userName: s.userName, language: s.language, theme: s.theme }),
    }
  )
)
