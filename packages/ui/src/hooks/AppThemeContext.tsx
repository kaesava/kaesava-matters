"use client";

import React, { createContext, useContext } from "react";
import { DESIGN_TOKENS, type DesignTokens } from "../tokens";

const AppThemeContext = createContext<DesignTokens>(DESIGN_TOKENS);

export function AppThemeProvider({
  theme = DESIGN_TOKENS,
  children,
}: {
  theme?: DesignTokens;
  children: React.ReactNode;
}) {
  return (
    <AppThemeContext.Provider value={theme}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): DesignTokens {
  return useContext(AppThemeContext);
}
