import { create } from 'zustand';

type UserPanelState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useUserPanel = create<UserPanelState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
