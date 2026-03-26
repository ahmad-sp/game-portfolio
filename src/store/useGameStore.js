import { create } from 'zustand';

const useGameStore = create((set) => ({
  splashDone: false,
  gameStarted: false,
  currentMenuIndex: 0,
  activeSection: null,
  soundEnabled: true,
  highSensitivity: false,

  setSplashDone: (val) => set({ splashDone: val }),
  setGameStarted: (val) => set({ gameStarted: val }),
  setCurrentMenuIndex: (val) => set({ currentMenuIndex: val }),
  setActiveSection: (val) => set({ activeSection: val }),
  setSoundEnabled: (val) => set({ soundEnabled: val }),
  toggleSensitivity: () => set((state) => ({ highSensitivity: !state.highSensitivity })),
}));

export default useGameStore;
