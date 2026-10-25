"use client";
import { createContext, useContext, useEffect, useState } from "react";
type Theme = "light" | "dark";
const ThemeContext = createContext<{theme:Theme;toggle:()=>void}>({theme:"light",toggle:()=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}) {
  const [theme,setTheme]=useState<Theme>("light");
  useEffect(()=>{const saved=localStorage.getItem("devflow-theme");const initial:Theme=saved==="dark"?"dark":"light";setTheme(initial);document.documentElement.dataset.theme=initial;},[]);
  function toggle(){const next:Theme=theme==="dark"?"light":"dark";setTheme(next);document.documentElement.dataset.theme=next;localStorage.setItem("devflow-theme",next);}
  return <ThemeContext.Provider value={{theme,toggle}}>{children}</ThemeContext.Provider>;
}
export function useTheme(){return useContext(ThemeContext);}
