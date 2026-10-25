import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ApiKey } from "@/lib/models";
import { ApiKeysManager } from "@/components/api-keys-manager";
export const dynamic="force-dynamic";
export default async function ApiKeysPage(){const user=await getCurrentUser();if(!user)return null;await connectDB();const keys=await ApiKey.find({userId:user.id}).sort({createdAt:-1}).lean();return <><div className="page-heading"><div><h1>API keys</h1><p className="subtitle">Create and revoke credentials for your applications.</p></div></div><ApiKeysManager initialKeys={keys.map((k:any)=>({id:String(k._id),name:k.name,prefix:k.prefix,createdAt:new Date(k.createdAt).toISOString(),lastUsedAt:k.lastUsedAt?new Date(k.lastUsedAt).toISOString():null,revoked:!!k.revokedAt}))}/></>;}
