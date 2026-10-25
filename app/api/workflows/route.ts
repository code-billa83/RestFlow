import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Workflow } from "@/lib/models";
import { makeWebhookPath,safeUrl } from "@/lib/utils";
const schema=z.object({name:z.string().trim().min(2).max(80),targetUrl:z.string().url().max(2000),intervalMin:z.number().int().min(5).max(1440)});
export async function POST(request:Request){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Enter a valid name, URL and interval (5–1440 minutes)."},{status:400});try{safeUrl(parsed.data.targetUrl)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid target URL."},{status:400});}await connectDB();const w=await Workflow.create({...parsed.data,webhookPath:makeWebhookPath(),userId:user.id});return NextResponse.json({workflow:toDto(w)},{status:201});}
function toDto(w:any){return {id:String(w._id),name:w.name,webhookPath:w.webhookPath,targetUrl:w.targetUrl,intervalMin:w.intervalMin,enabled:w.enabled,lastRunAt:w.lastRunAt?new Date(w.lastRunAt).toISOString():null,lastStatus:w.lastStatus};}
