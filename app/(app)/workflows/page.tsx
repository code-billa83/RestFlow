import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Workflow } from "@/lib/models";
import { WorkflowsManager } from "@/components/workflows-manager";
export const dynamic="force-dynamic";
export default async function WorkflowsPage(){const user=await getCurrentUser();if(!user)return null;await connectDB();const items=await Workflow.find({userId:user.id}).sort({createdAt:-1}).lean();return <><div className="page-heading"><div><h1>Automations</h1><p className="subtitle">Create scheduled HTTP workflows or webhook-triggered tasks.</p></div></div><WorkflowsManager initialWorkflows={items.map((w:any)=>({id:String(w._id),name:w.name,webhookPath:w.webhookPath,targetUrl:w.targetUrl,intervalMin:w.intervalMin,enabled:w.enabled,lastRunAt:w.lastRunAt?new Date(w.lastRunAt).toISOString():null,lastStatus:w.lastStatus}))}/></>;}
