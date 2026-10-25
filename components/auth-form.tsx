"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent,useState } from "react";
import { ThemeProvider,useTheme } from "@/components/theme-provider";
function ThemeButton(){const {theme,toggle}=useTheme();return <button className="btn" type="button" onClick={toggle}>{theme==="dark"?"☀ Light mode":"☾ Dark mode"}</button>}
function FormInner({mode}:{mode:"login"|"register"}){
 const router=useRouter();const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setError("");setBusy(true);try{const res=await fetch(`/api/auth/${mode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(mode==="register"?{name,email,password}:{email,password})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Request failed.");router.push("/dashboard");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Request failed.");}finally{setBusy(false);}}
 return <div className="auth-wrap"><div className="auth-card"><div className="inline-actions" style={{justifyContent:"space-between"}}><div className="brand"><span className="brand-mark">D</span><span>DevFlow</span></div><ThemeButton/></div><h1>{mode==="login"?"Welcome back":"Create your workspace"}</h1><p className="subtitle">{mode==="login"?"Sign in to manage your APIs and automations.":"Start building with your own API workspace."}</p>{error&&<div className="toast error" style={{marginTop:16}}>{error}</div>}
 <form className="auth-form" onSubmit={submit}>{mode==="register"&&<div className="field"><label htmlFor="name">Full name</label><input id="name" className="input" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={80} required/></div>}
 <div className="field"><label htmlFor="email">Email address</label><input id="email" className="input" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="field"><label htmlFor="password">Password</label><input id="password" className="input" type="password" autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} required/></div><button className="btn primary" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in":"Create account"}</button></form>
 <div className="auth-footer">{mode==="login"?<>New to DevFlow? <Link href="/register">Create an account</Link></>:<>Already have an account? <Link href="/login">Sign in</Link></>}</div></div></div>;
}
export function AuthForm({mode}:{mode:"login"|"register"}){return <ThemeProvider><FormInner mode={mode}/></ThemeProvider>;}
