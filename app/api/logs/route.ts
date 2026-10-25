import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ApiRequestLog } from "@/lib/models";
const schema=z.object({method:z.enum(["GET","POST","PUT","PATCH","DELETE","HEAD"]),path:z.string().min(1).max(500),statusCode:z.number().int().min(100).max(599),durationMs:z.number().int().min(0).max(600000)});
export async function POST(request:Request){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid log payload"},{status:400});await connectDB();const log=await ApiRequestLog.create({...parsed.data,userId:user.id});return NextResponse.json({id:String(log._id)},{status:201});}
