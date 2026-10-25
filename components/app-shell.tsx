"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, ArrowLeftRight, Bot, KeyRound, LayoutDashboard, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
const links = [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }, { href: "/playground", label: "API Playground", icon: ArrowLeftRight }, { href: "/workflows", label: "Automations", icon: Bot }, { href: "/api-keys", label: "API Keys", icon: KeyRound }, { href: "/activity", label: "Request Logs", icon: Activity }];
function ShellContent({ children, user }: { children: React.ReactNode; user: { name: string; email: string } }) {
  const pathname = usePathname(), router = useRouter(); const [open, setOpen] = useState(false); const { theme, toggle } = useTheme();
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }
  return <div className="shell">
    {open && <button aria-label="Close menu overlay" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 25, background: "#0008", border: 0 }} />}
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Link className="brand" href="/dashboard" onClick={() => setOpen(false)}><span className="brand-mark">D</span><span>DevFlow</span></Link><button className="icon-btn mobile-menu" aria-label="Close menu" onClick={() => setOpen(false)} style={{ marginBottom: 22 }}><X size={18} /></button></div>
      <div className="nav-label">Workspace</div>
      {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`nav-link ${pathname === href ? "active" : ""}`}><Icon size={18} />{label}</Link>)}
      <div className="nav-label" style={{ marginTop: 18 }}>Preferences</div>
      <button className="nav-link" onClick={toggle}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}Switch to {theme === "dark" ? "light" : "dark"} theme</button>
      <div className="sidebar-bottom"><div className="side-note"><strong style={{ color: "var(--text)" }}>DevFlow starter</strong><br />Your APIs, logs and workflows in one place.</div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={20} /></button><div className="breadcrumb muted" style={{ fontSize: 13 }}>Workspace / <strong style={{ color: "var(--text)" }}>{links.find(l => l.href === pathname)?.label ?? "DevFlow"}</strong></div>
        <div className="top-actions"><button className="icon-btn" aria-label="Toggle color theme" onClick={toggle}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><div className="user-chip"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span className="user-name" style={{ fontSize: 12, fontWeight: 700 }}>{user.name}</span></div><button className="icon-btn" aria-label="Sign out" onClick={logout}><LogOut size={17} /></button></div></header>
      {children}
      <footer style={{ marginTop: "auto", padding: "28px 4px 8px", textAlign: "center" }}>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>© 2026 Shiva Mishra. All rights reserved.</p>
      </footer>
    </main></div>;
}
export function AppShell({ children, user }: { children: React.ReactNode; user: { name: string; email: string } }) { return <ThemeProvider><ShellContent user={user}>{children}</ShellContent></ThemeProvider>; }
