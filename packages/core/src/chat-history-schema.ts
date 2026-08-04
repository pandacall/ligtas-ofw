/**
 * Server-side validation for the history digest.
 *
 * Split out from chat-history.ts on purpose: that module is imported by the chat UI, which is
 * a client component, so anything it pulls in ships to the browser. Keeping zod here holds
 * ~13kB of validation code out of a bundle downloaded over prepaid mobile data — and the
 * client never validates history anyway, since the Surface is the only thing that receives it
 * from an untrusted source.
 *
 * ChatHistoryEntryShape is checked against the hand-written type at compile time below, so the
 * two cannot drift.
 */
import { z } from "zod";
import type { ChatHistoryEntry } from "./chat-history";

export const ChatHistoryEntrySchema = z.object({
  role: z.enum(["user", "bantatay"]),
  content: z.string(),
});

/** History arrives as client-supplied JSON and is never trusted. */
export const ChatHistory = z.array(ChatHistoryEntrySchema).max(50);

// Compile-time guard: if ChatHistoryEntry gains a field, this stops matching and fails the build.
type SchemaMatchesType = z.infer<typeof ChatHistoryEntrySchema> extends ChatHistoryEntry
  ? ChatHistoryEntry extends z.infer<typeof ChatHistoryEntrySchema>
    ? true
    : never
  : never;
const _schemaMatchesType: SchemaMatchesType = true;
void _schemaMatchesType;
