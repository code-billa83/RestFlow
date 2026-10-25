import Link from "next/link";
import { Activity, ArrowUpRight, Bot, CheckCircle2, KeyRound, Plus, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ApiKey, ApiRequestLog, Workflow } from "@/lib/models";
export const dynamic="force-dynamic";
export default async function DashboardPage(){
 const user=await getCurrentUser();if(!user)return null;await connectDB();
 const [requests,keyCount,workflowCount,logs,workflows,success]=await Promise.all([
  ApiRequestLog.countDocuments({userId:user.id}),ApiKey.countDocuments({userId:user.id,revokedAt:null}),Workflow.countDocuments({userId:user.id,enabled:true}),
  ApiRequestLog.find({userId:user.id}).sort({createdAt:-1}).limit(5).lean(),Workflow.find({userId:user.id}).sort({createdAt:-1}).limit(4).lean(),ApiRequestLog.countDocuments({userId:user.id,statusCode:{$lt:400}})
 ]);
 const rate=requests?Math.round(success/requests*100):100;
 return <><div className="page-heading"><div><h1>Good to see you, {user.name.split(" ")[0]} 👋</h1><p className="subtitle">Here’s what’s happening in your workspace today.</p></div><Link href="/playground" className="btn primary"><Plus size={16}/> New API request</Link></div>
 <div className="grid stats-grid"><Stat title="Total API requests" value={requests.toLocaleString()} foot="Recorded in your workspace" icon={<Activity size={18}/>}/><Stat title="Active API keys" value={String(keyCount)} foot="Keys that can be used" icon={<KeyRound size={18}/>}/><Stat title="Active automations" value={String(workflowCount)} foot="Enabled workflows" icon={<Bot size={18}/>}/><Stat title="Success rate" value={`${rate}%`} foot="Based on recorded requests" icon={<CheckCircle2 size={18}/>}/></div>
 <div className="grid two-col"><section className="card"><div className="card-heading"><div><h2>Recent API activity</h2><p>Your latest request events</p></div><Link href="/activity" className="btn">View logs <ArrowUpRight size={15}/></Link></div>
 {logs.length?<div className="activity-list">{logs.map((log:any)=><div className="activity" key={String(log._id)}><span className="activity-dot" style={{background:log.statusCode<400?"var(--green)":"var(--red)"}}/><div className="activity-main"><div className="activity-title"><span className="method">{log.method}</span> &nbsp;{log.path}</div><div className="activity-sub">{log.durationMs} ms · {new Date(log.createdAt).toLocaleString()}</div></div><span className={`badge ${log.statusCode<400?"success":"error"}`}>{log.statusCode}</span></div>)}</div>:<div className="empty"><Activity size={25}/><p>No API activity yet.</p><Link href="/playground" className="btn primary">Send your first request</Link></div>}</section>
 <section className="card"><div className="card-heading"><div><h2>Automation overview</h2><p>Recent workflows</p></div><Link href="/workflows" className="btn">Manage <ArrowUpRight size={15}/></Link></div>
 {workflows.length?<div className="activity-list">{workflows.map((w:any)=><div className="activity" key={String(w._id)}><span className="stat-icon"><Zap size={17}/></span><div className="activity-main"><div className="activity-title">{w.name}</div><div className="activity-sub">{w.intervalMin} min interval</div></div><span className={`badge ${w.enabled?"success":""}`}>{w.enabled?"Enabled":"Paused"}</span></div>)}</div>:<div className="empty"><Bot size={25}/><p>No workflows created yet.</p><Link href="/workflows" className="btn primary">Create workflow</Link></div>}</section></div>
 </>;
}
function Stat({title,value,foot,icon}:{title:string;value:string;foot:string;icon:React.ReactNode}){return <div className="card"><div className="stat-top"><span>{title}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></div>}
function Quick({href,icon,title,text}:{href:string;icon:React.ReactNode;title:string;text:string}){return <Link href={href} className="card" style={{padding:15,boxShadow:"none"}}><div style={{color:"var(--primary)",marginBottom:12}}>{icon}</div><div style={{fontWeight:700,fontSize:13,marginBottom:6}}>{title}</div><div className="muted" style={{fontSize:12,lineHeight:1.5}}>{text}</div></Link>}
