import { create } from "zustand";

interface Profile {
  id: string;
  name: string;
  age?: number;
  timezone: string;
  declared_priorities: string[];
  subscription_tier: string;
  onboarding_completed: boolean;
}

interface UserStore {
  profile: Profile | null;
  lifeScore: number;
  setProfile: (p: Profile) => void;
  setLifeScore: (s: number) => void;
  clear: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  lifeScore: 0,
  setProfile: (profile) => set({ profile }),
  setLifeScore: (lifeScore) => set({ lifeScore }),
  clear: () => set({ profile: null, lifeScore: 0 }),
}));
