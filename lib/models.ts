import mongoose, { Schema, Model } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

const apiKeySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  prefix: { type: String, required: true },
  keyHash: { type: String, required: true, unique: true, select: false },
  lastUsedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
}, { timestamps: true });

const logSchema = new Schema({
  method: { type: String, required: true },
  path: { type: String, required: true, maxlength: 500 },
  statusCode: { type: Number, required: true, min: 100, max: 599 },
  durationMs: { type: Number, required: true, min: 0, max: 600000 },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
}, { timestamps: true });

const workflowSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  webhookPath: { type: String, required: true, unique: true },
  targetUrl: { type: String, required: true, maxlength: 2000 },
  intervalMin: { type: Number, required: true, min: 5, max: 1440, default: 60 },
  enabled: { type: Boolean, default: false },
  lastRunAt: { type: Date, default: null },
  nextRunAt: { type: Date, default: null, index: true },
  lastStatus: { type: String, default: null },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
}, { timestamps: true });


const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

export const RateLimitBucket: Model<any> = mongoose.models.RateLimitBucket || mongoose.model("RateLimitBucket", rateLimitSchema);
export const User: Model<any> = mongoose.models.User || mongoose.model("User", userSchema);
export const ApiKey: Model<any> = mongoose.models.ApiKey || mongoose.model("ApiKey", apiKeySchema);
export const ApiRequestLog: Model<any> = mongoose.models.ApiRequestLog || mongoose.model("ApiRequestLog", logSchema);
export const Workflow: Model<any> = mongoose.models.Workflow || mongoose.model("Workflow", workflowSchema);
