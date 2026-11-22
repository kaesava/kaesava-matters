import { z } from "zod";
import {
  CreatePreSignedUrlInput,
  CreateFileNoteInput,
  UpdateFileNoteCommentInput,
  FileNotesListInput,
  FileNoteDto,
  StorageQuotaDto,
} from "@money-matters/types";
import {
  createPreSignedUrlHandler,
  createFileNoteHandler,
  listFileNotesHandler,
  getDownloadUrlHandler,
  updateFileNoteCommentHandler,
  archiveFileNoteHandler,
  getStorageQuotaHandler,
} from "../index";

export const fileNotesIdInput = z.object({ id: z.string().uuid() }).strict();

export const fileNotesProcedures = {
  createPreSignedUrl: {
    input: CreatePreSignedUrlInput,
    execute: createPreSignedUrlHandler,
  },
  create: {
    input: CreateFileNoteInput,
    output: FileNoteDto,
    execute: createFileNoteHandler,
  },
  list: {
    input: FileNotesListInput,
    output: z.array(FileNoteDto),
    execute: listFileNotesHandler,
  },
  getDownloadUrl: {
    input: fileNotesIdInput,
    execute: getDownloadUrlHandler,
  },
  updateComment: {
    input: UpdateFileNoteCommentInput,
    output: FileNoteDto,
    execute: updateFileNoteCommentHandler,
  },
  archive: {
    input: fileNotesIdInput,
    execute: archiveFileNoteHandler,
  },
  getStorageQuota: {
    output: StorageQuotaDto,
    execute: getStorageQuotaHandler,
  },
} as const;
