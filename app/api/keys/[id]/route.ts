import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ApiKey } from "@/lib/models";
export async function DELETE(_request:Request,context:{params:Promise<{id:string}>}){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const {id}=await context.params;if(!mongoose.isValidObjectId(id))return NextResponse.json({error:"Invalid key id."},{status:400});await connectDB();const key=await ApiKey.findOneAndUpdate({_id:id,userId:user.id,revokedAt:null},{revokedAt:new Date()});if(!key)return NextResponse.json({error:"Key not found or already revoked."},{status:404});return NextResponse.json({ok:true});}
