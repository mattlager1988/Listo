import React, { createContext, useContext, useState, useCallback } from 'react';

interface MenuContextType {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const MenuContext = createContext<MenuContextType>({
  menuOpen: false,
  openMenu: () => {},
  closeMenu: () => {},
});

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <MenuContext.Provider value={{ menuOpen, openMenu, closeMenu }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => useContext(MenuContext);
