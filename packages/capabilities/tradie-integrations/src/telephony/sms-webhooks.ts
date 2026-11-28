import { and, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import {
  fileNotes,
  tmCommLogs,
  tmCustomers,
  tmJobAttachments,
  tmJobs,
  tmPhoneNumbers,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import type { IntegrationsContext } from "../accounting/sync-service.js";
import { deductSmsCreditsCommand } from "./sms-credits.js";

export interface TwilioRestEnv {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  fetcher?: typeof fetch;
}

export const SendOnMyWaySmsInput = z
  .object({
    jobId: z.string().uuid(),
    recipientPhone: z.string().min(6).max(32),
    originLat: z.number(),
    originLng: z.number(),
    destLat: z.number(),
    destLng: z.number(),
    tradieName: z.string().min(1),
  })
  .strict();

export function estimateEtaMinutes(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(5, Math.round((km / 45) * 60));
}

export function normalizeAuPhone(raw: string): string {
  const cleaned = raw.replace(/[\s()-]/g, "");
  if (cleaned.startsWith("04") && cleaned.length === 10) {
    return `+61${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("614") && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  return cleaned;
}

async function sendTwilioSms(
  env: TwilioRestEnv,
  from: string,
  to: string,
  body: string,
  mediaUrl?: string
): Promise<void> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return;
  const fn = env.fetcher ?? fetch;
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  const params = new URLSearchParams({ From: from, To: to, Body: body });
  if (mediaUrl) params.set("MediaUrl", mediaUrl);
  const res = await fn(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );
  if (!res.ok) {
    throw new Error(`Twilio SMS failed (${res.status}): ${await res.text()}`);
  }
}

export async function sendOnMyWaySmsCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  env: TwilioRestEnv,
  input: z.infer<typeof SendOnMyWaySmsInput>
) {
  const [phone] = await db
    .select()
    .from(tmPhoneNumbers)
    .where(and(eq(tmPhoneNumbers.tenantId, ctx.tenantId), eq(tmPhoneNumbers.appId, ctx.appId), isNull(tmPhoneNumbers.archivedAt)))
    .limit(1);
  if (!phone) throw new Error("No dedicated business phone number is configured.");

  const etaMinutes = estimateEtaMinutes(input.originLat, input.originLng, input.destLat, input.destLng);
  const body = `Hi, ${input.tradieName} is on the way and should arrive in ~${etaMinutes} mins.`;
  const now = new Date();
  const commLogId = crypto.randomUUID();

  await sendTwilioSms(env, phone.e164Number, input.recipientPhone, body);
  await deductSmsCreditsCommand(db, ctx, { cost: 1, reason: "OUTBOUND_SMS", commLogId });

  const [log] = await db
    .insert(tmCommLogs)
    .values({
      id: commLogId,
      entityType: "JOB",
      entityId: input.jobId,
      channel: "SMS",
      direction: "OUTBOUND",
      recipient: input.recipientPhone,
      subject: "On My Way ETA",
      bodyPreview: body,
      status: "SENT",
      sentAt: now,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  return { log, etaMinutes };
}

export async function handleInboundTwilioSms(
  db: DbOrTx,
  input: {
    toNumber: string;
    fromNumber: string;
    body: string;
    mediaUrls?: string[];
    uploadMediaToR2?: (url: string, key: string) => Promise<{ fileKey: string; fileName: string; mimeType: string; size: number }>;
  }
) {
  const [phone] = await db
    .select()
    .from(tmPhoneNumbers)
    .where(and(eq(tmPhoneNumbers.e164Number, input.toNumber), isNull(tmPhoneNumbers.archivedAt)))
    .limit(1);
  if (!phone) return { matched: false as const };

  const now = new Date();
  const ctx = { tenantId: phone.tenantId, appId: phone.appId, userId: phone.createdBy };

  const [recentMissed] = await db
    .select()
    .from(tmCommLogs)
    .where(
      and(
        eq(tmCommLogs.tenantId, ctx.tenantId),
        eq(tmCommLogs.appId, ctx.appId),
        eq(tmCommLogs.recipient, input.fromNumber),
        eq(tmCommLogs.subject, "Missed Call Auto-SMS"),
        isNull(tmCommLogs.archivedAt)
      )
    )
    .orderBy(desc(tmCommLogs.sentAt))
    .limit(1);

  let leadJobId: string | null = null;
  if (recentMissed) {
    const normalizedPhone = normalizeAuPhone(input.fromNumber);
    const [existingCustomer] = await db
      .select()
      .from(tmCustomers)
      .where(
        and(
          eq(tmCustomers.tenantId, ctx.tenantId),
          eq(tmCustomers.appId, ctx.appId),
          or(eq(tmCustomers.phone, normalizedPhone), eq(tmCustomers.phone, input.fromNumber)),
          isNull(tmCustomers.archivedAt)
        )
      )
      .limit(1);

    let customerId = existingCustomer?.id;
    if (!customerId) {
      customerId = crypto.randomUUID();
      await db.insert(tmCustomers).values({
        id: customerId,
        name: `Lead ${normalizedPhone}`,
        phone: normalizedPhone,
        email: null,
        tenantId: ctx.tenantId,
        appId: ctx.appId,
        createdAt: now,
        createdBy: ctx.userId,
        updatedAt: now,
        updatedBy: ctx.userId,
      });
    }

    leadJobId = crypto.randomUUID();
    await db.insert(tmJobs).values({
      id: leadJobId,
      jobNumber: `LEAD-${now.getTime().toString().slice(-6)}`,
      title: `Inbound SMS Lead (${normalizedPhone})`,
      description: input.body,
      status: "LEAD",
      priority: "NORMAL",
      customerId,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    });
  }

  const commLogId = crypto.randomUUID();
  await db.insert(tmCommLogs).values({
    id: commLogId,
    entityType: leadJobId ? "JOB" : "PHONE",
    entityId: leadJobId ?? phone.id,
    channel: input.mediaUrls?.length ? "MMS" : "SMS",
    direction: "INBOUND",
    recipient: input.fromNumber,
    subject: "Inbound SMS",
    bodyPreview: input.body.slice(0, 500),
    status: "RECEIVED",
    sentAt: now,
    tenantId: ctx.tenantId,
    appId: ctx.appId,
    createdAt: now,
    createdBy: ctx.userId,
    updatedAt: now,
    updatedBy: ctx.userId,
  });

  const savedFileNoteIds: string[] = [];
  if (input.mediaUrls?.length && input.uploadMediaToR2) {
    for (let i = 0; i < input.mediaUrls.length; i++) {
      const uploaded = await input.uploadMediaToR2(input.mediaUrls[i]!, `apps/${ctx.appId}/mms/${commLogId}-${i}`);
      const fileNoteId = crypto.randomUUID();
      await db.insert(fileNotes).values({
        id: fileNoteId,
        entityType: leadJobId ? "JOB" : "COMM_LOG",
        entityId: leadJobId ?? commLogId,
        comment: `Inbound MMS attachment from ${input.fromNumber}`,
        fileKey: uploaded.fileKey,
        fileName: uploaded.fileName,
        fileMimeType: uploaded.mimeType,
        fileSize: String(uploaded.size),
        isPrivate: false,
        isAutoGenerated: true,
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        appId: ctx.appId,
        createdAt: now,
        createdBy: ctx.userId,
        updatedAt: now,
        updatedBy: ctx.userId,
      });
      if (leadJobId) {
        await db.insert(tmJobAttachments).values({
          id: crypto.randomUUID(),
          jobId: leadJobId,
          fileNoteId,
          caption: `Inbound MMS from ${input.fromNumber}`,
          tenantId: ctx.tenantId,
          appId: ctx.appId,
          createdAt: now,
          createdBy: ctx.userId,
          updatedAt: now,
          updatedBy: ctx.userId,
        });
      }
      savedFileNoteIds.push(fileNoteId);
    }
  }

  return { matched: true as const, commLogId, leadJobId, savedFileNoteIds };
}

export async function handleTwilioMissedCallWebhook(
  db: DbOrTx,
  env: TwilioRestEnv,
  input: { toNumber: string; fromNumber: string; callSid: string }
) {
  const [phone] = await db
    .select()
    .from(tmPhoneNumbers)
    .where(and(eq(tmPhoneNumbers.e164Number, input.toNumber), isNull(tmPhoneNumbers.archivedAt)))
    .limit(1);

  if (!phone || !phone.missedCallAutoTextEnabled) {
    return { sent: false };
  }

  const ctx: IntegrationsContext = { tenantId: phone.tenantId, appId: phone.appId, userId: phone.createdBy };
  const template =
    phone.missedCallTemplate ||
    "Sorry we missed your call! Reply with your job details or photos and we'll get straight back to you.";
  const commLogId = crypto.randomUUID();
  const now = new Date();

  await sendTwilioSms(env, phone.e164Number, input.fromNumber, template);
  await deductSmsCreditsCommand(db, ctx, { cost: 1, reason: "MISSED_CALL_AUTO", commLogId });

  await db.insert(tmCommLogs).values({
    id: commLogId,
    entityType: "PHONE",
    entityId: phone.id,
    channel: "SMS",
    direction: "OUTBOUND",
    recipient: input.fromNumber,
    subject: "Missed Call Auto-SMS",
    bodyPreview: template,
    status: "SENT",
    sentAt: now,
    tenantId: ctx.tenantId,
    appId: ctx.appId,
    createdAt: now,
    createdBy: ctx.userId,
    updatedAt: now,
    updatedBy: ctx.userId,
  });

  return { sent: true, commLogId, twilioPhoneSid: phone.twilioPhoneSid };
}

export const SavePhoneConfigInput = z
  .object({
    e164Number: z.string().min(6).max(32),
    missedCallAutoTextEnabled: z.boolean().default(true),
    missedCallTemplate: z.string().max(500).nullable().optional(),
  })
  .strict();

export async function getPhoneConfigQuery(db: DbOrTx, ctx: Pick<IntegrationsContext, "tenantId" | "appId">) {
  const [phone] = await db
    .select()
    .from(tmPhoneNumbers)
    .where(and(eq(tmPhoneNumbers.tenantId, ctx.tenantId), eq(tmPhoneNumbers.appId, ctx.appId), isNull(tmPhoneNumbers.archivedAt)))
    .limit(1);
  return phone ?? null;
}

export async function savePhoneConfigCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  input: z.infer<typeof SavePhoneConfigInput>
) {
  const existing = await getPhoneConfigQuery(db, ctx);
  const now = new Date();
  if (existing) {
    const [updated] = await db
      .update(tmPhoneNumbers)
      .set({
        e164Number: input.e164Number,
        missedCallAutoTextEnabled: input.missedCallAutoTextEnabled,
        missedCallTemplate: input.missedCallTemplate ?? null,
        updatedAt: now,
        updatedBy: ctx.userId,
      })
      .where(eq(tmPhoneNumbers.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(tmPhoneNumbers)
    .values({
      id: crypto.randomUUID(),
      e164Number: input.e164Number,
      twilioPhoneSid: `PN-${crypto.randomUUID().slice(0, 12)}`,
      missedCallAutoTextEnabled: input.missedCallAutoTextEnabled,
      missedCallTemplate: input.missedCallTemplate ?? null,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();
  return created;
}

export async function listSmsThreadsQuery(db: DbOrTx, ctx: Pick<IntegrationsContext, "tenantId" | "appId">) {
  const logs = await db
    .select()
    .from(tmCommLogs)
    .where(and(eq(tmCommLogs.tenantId, ctx.tenantId), eq(tmCommLogs.appId, ctx.appId), isNull(tmCommLogs.archivedAt)))
    .orderBy(desc(tmCommLogs.sentAt));

  const seen = new Map<string, typeof logs[number]>();
  for (const log of logs) {
    if (log.recipient && (log.channel === "SMS" || log.channel === "MMS") && !seen.has(log.recipient)) {
      seen.set(log.recipient, log);
    }
  }
  return Array.from(seen.values());
}

export async function listSmsMessagesQuery(
  db: DbOrTx,
  ctx: Pick<IntegrationsContext, "tenantId" | "appId">,
  recipient: string
) {
  return db
    .select()
    .from(tmCommLogs)
    .where(
      and(
        eq(tmCommLogs.tenantId, ctx.tenantId),
        eq(tmCommLogs.appId, ctx.appId),
        eq(tmCommLogs.recipient, recipient),
        isNull(tmCommLogs.archivedAt)
      )
    )
    .orderBy(desc(tmCommLogs.sentAt));
}

export const SendSmsReplyInput = z
  .object({
    recipientPhone: z.string().min(6).max(32),
    body: z.string().min(1).max(1600),
    mediaUrl: z.string().url().optional(),
  })
  .strict();

export async function sendSmsReplyCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  env: TwilioRestEnv,
  input: z.infer<typeof SendSmsReplyInput>
) {
  const phone = await getPhoneConfigQuery(db, ctx);
  if (!phone) throw new Error("No dedicated business phone number is configured.");

  const isMms = Boolean(input.mediaUrl);
  const commLogId = crypto.randomUUID();
  const now = new Date();

  await sendTwilioSms(env, phone.e164Number, input.recipientPhone, input.body, input.mediaUrl);
  await deductSmsCreditsCommand(db, ctx, {
    cost: isMms ? 3 : 1,
    reason: isMms ? "OUTBOUND_MMS" : "OUTBOUND_SMS",
    commLogId,
  });

  const [log] = await db
    .insert(tmCommLogs)
    .values({
      id: commLogId,
      entityType: "PHONE",
      entityId: phone.id,
      channel: isMms ? "MMS" : "SMS",
      direction: "OUTBOUND",
      recipient: input.recipientPhone,
      subject: isMms ? "Outbound MMS" : "Outbound SMS",
      bodyPreview: input.body.slice(0, 500),
      status: "SENT",
      sentAt: now,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();
  return log;
}
