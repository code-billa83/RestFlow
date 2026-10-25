import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { createSession } from "@/lib/auth";
import { checkRateLimit, sameOriginRequest, jsonNoStoreHeaders } from "@/lib/security";
const schema=z.object({name:z.string().trim().min(2).max(80),email:z.string().trim().email().max(254),password:z.string().min(8).max(128)});
export async function POST(request:Request){
 if (!sameOriginRequest(request)) return NextResponse.json({error:"Invalid request origin."},{status:403,headers:jsonNoStoreHeaders()});
 const contentLength = Number(request.headers.get("content-length") || 0);
 if (contentLength > 8192) return NextResponse.json({error:"Request too large."},{status:413,headers:jsonNoStoreHeaders()});
 try {
   if (!(await checkRateLimit(request,"register",5,15*60*1000))) return NextResponse.json({error:"Too many attempts. Try again in 15 minutes."},{status:429,headers:{...jsonNoStoreHeaders(),"Retry-After":"900"}});
 } catch { return NextResponse.json({error:"Security service temporarily unavailable."},{status:503,headers:jsonNoStoreHeaders()}); }

 try{const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Name, valid email and password (8+ characters) required."},{status:400});
 await connectDB();const email=parsed.data.email.toLowerCase();if(await User.exists({email}))return NextResponse.json({error:"An account with this email already exists."},{status:409});
 const user=await User.create({name:parsed.data.name,email,passwordHash:await bcrypt.hash(parsed.data.password,12)});await createSession(String(user._id));return NextResponse.json({ok:true},{status:201});
 }catch(error){console.error("register endpoint failed");return NextResponse.json({error:"Unable to register. Check MongoDB and environment settings."},{status:500});}
}
