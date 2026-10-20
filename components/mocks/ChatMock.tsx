import { ArrowLeft, Mic, Phone, Video } from "lucide-react";
import type { ReactNode } from "react";
import type { Mock } from "@/lib/schema";
import { PhoneFrame } from "./Frames";

type Chat = Extract<Mock, { kind: "chat" }>;

/** WhatsApp chat screen: header, wallpaper and input bar. */
export function ChatShell({ contact, status, children }: { contact: string; status: string; children: ReactNode }) {
  return (
    <PhoneFrame>
      <div className="flex items-center gap-3 bg-wa-header px-3 py-3 text-white">
        <ArrowLeft aria-hidden className="size-5" />
        <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
          {contact.charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{contact}</span>
          <span className="block text-[11px] text-white/85">{status}</span>
        </span>
        <Video aria-hidden className="size-5" />
        <Phone aria-hidden className="size-4.5" />
      </div>
      <div className="space-y-2 bg-wa-bg px-3 py-4">{children}</div>
      <div className="flex items-center gap-2 bg-wa-bg px-2 pb-4">
        <span className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm text-wa-time">Message</span>
        <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-wa-header text-white">
          <Mic className="size-5" />
        </span>
      </div>
    </PhoneFrame>
  );
}

export function ChatLabel({ children }: { children: ReactNode }) {
  return (
    <p className="flex justify-center pt-1">
      <span className="rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-wa-time shadow-sm">{children}</span>
    </p>
  );
}

export function Bubble({
  from,
  time,
  children,
  buttons,
}: {
  from: "business" | "customer";
  time: string;
  children: ReactNode;
  buttons?: string[];
}) {
  const mine = from === "customer";
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 pt-2 pb-1.5 text-[13px] leading-snug text-wa-text shadow-sm ${
          mine ? "rounded-tr-none bg-wa-out" : "rounded-tl-none bg-wa-in"
        }`}
      >
        <div className="whitespace-pre-line">{children}</div>
        <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-wa-time">
          {time}
          {mine ? (
            <span aria-hidden className="text-wa-tick">
              ✓✓
            </span>
          ) : null}
        </p>
      </div>
      {buttons?.length ? (
        <div className="mt-1 flex w-[85%] flex-col gap-1">
          {buttons.map((b) => (
            <span key={b} className="rounded-lg bg-wa-in py-2 text-center text-[13px] font-semibold text-wa-header shadow-sm">
              {b}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ChatMock({ mock }: { mock: Chat }) {
  return (
    <ChatShell contact={mock.contact} status={mock.status}>
      {mock.messages.map((m, i) => (
        <div key={i} className="space-y-2">
          {m.label ? <ChatLabel>{m.label}</ChatLabel> : null}
          <Bubble from={m.from} time={m.time} buttons={m.buttons}>
            {m.text}
          </Bubble>
        </div>
      ))}
    </ChatShell>
  );
}
