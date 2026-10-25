import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { createSession } from "@/lib/auth";
import { checkRateLimit, sameOriginRequest, jsonNoStoreHeaders } from "@/lib/security";
const schema=z.object({email:z.string().trim().email(),password:z.string().min(1).max(128)});
export async function POST(request:Request){
 if (!sameOriginRequest(request)) return NextResponse.json({error:"Invalid request origin."},{status:403,headers:jsonNoStoreHeaders()});
 const contentLength = Number(request.headers.get("content-length") || 0);
 if (contentLength > 8192) return NextResponse.json({error:"Request too large."},{status:413,headers:jsonNoStoreHeaders()});
 try {
   if (!(await checkRateLimit(request,"login",8,15*60*1000))) return NextResponse.json({error:"Too many attempts. Try again in 15 minutes."},{status:429,headers:{...jsonNoStoreHeaders(),"Retry-After":"900"}});
 } catch { return NextResponse.json({error:"Security service temporarily unavailable."},{status:503,headers:jsonNoStoreHeaders()}); }

 try{const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Enter a valid email and password."},{status:400});await connectDB();
 const user=await User.findOne({email:parsed.data.email.toLowerCase()});if(!user||!(await bcrypt.compare(parsed.data.password,user.passwordHash)))return NextResponse.json({error:"Email or password is incorrect."},{status:401});
 await createSession(String(user._id));return NextResponse.json({ok:true});
 }catch(error){console.error("login endpoint failed");return NextResponse.json({error:"Unable to sign in. Check MongoDB connection."},{status:500});}
}
