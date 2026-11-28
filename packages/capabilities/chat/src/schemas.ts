import { z } from "zod";

export const CreateChatRoomInput = z
  .object({
    entityType: z.string().min(1).max(40),
    entityId: z.string().uuid(),
    title: z.string().min(1).max(255),
    isPinned: z.boolean().optional(),
    memberUserIds: z.array(z.string().uuid()).optional(),
  })
  .strict();

export const PostChatMessageInput = z
  .object({
    roomId: z.string().uuid(),
    body: z.string().min(1).max(4000),
    replyToMessageId: z.string().uuid().optional(),
    mentionedUserIds: z.array(z.string().uuid()).optional(),
    mentionLookup: z.record(z.string(), z.string().uuid()).optional(),
  })
  .strict();

export const ListRoomMessagesInput = z
  .object({
    roomId: z.string().uuid(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .strict();

export const MarkRoomReadInput = z
  .object({
    roomId: z.string().uuid(),
  })
  .strict();

export type CreateChatRoomInputDto = z.infer<typeof CreateChatRoomInput>;
export type PostChatMessageInputDto = z.infer<typeof PostChatMessageInput>;
export type ListRoomMessagesInputDto = z.infer<typeof ListRoomMessagesInput>;
export type MarkRoomReadInputDto = z.infer<typeof MarkRoomReadInput>;

export interface ChatContext {
  tenantId: string;
  appId: string;
  userId: string;
}

export interface MentionUsersPayload {
  tenantId: string;
  appId: string;
  roomId: string;
  messageId: string;
  senderUserId: string;
  mentionedUserIds: string[];
  body: string;
}

export type OnMentionUsersCallback = (payload: MentionUsersPayload) => Promise<void> | void;
