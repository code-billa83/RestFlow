import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ApiKey } from "@/lib/models";
import { createApiKey } from "@/lib/utils";
const schema=z.object({name:z.string().trim().min(2).max(60)});
export async function POST(request:Request){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Key name must be 2–60 characters."},{status:400});await connectDB();const key=createApiKey();const saved=await ApiKey.create({name:parsed.data.name,prefix:key.prefix,keyHash:key.hash,userId:user.id});return NextResponse.json({secret:key.raw,key:{id:String(saved._id),name:saved.name,prefix:saved.prefix,createdAt:saved.createdAt.toISOString(),lastUsedAt:null,revoked:false}},{status:201});}
