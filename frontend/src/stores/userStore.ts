import { create } from 'zustand'

export type UserRole = 'user' | 'vip' | 'admin'

export interface UserProfile {
  userId: string
  username: string
  email: string
  role: UserRole
  emailVerified?: boolean
}

interface UserState {
  profile: UserProfile | null
  setProfile: (p: UserProfile | null) => void
  clear: () => void
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clear: () => set({ profile: null }),
}))
