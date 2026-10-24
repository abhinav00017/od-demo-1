import { fakeSender, getWhatsApp, HELLO_WORLD, maskNumber, providerOf, type WhatsAppSender } from "@/lib/whatsapp";
import { firstName, formatInr } from "./math";
import { SEED_PHONES } from "./seed";
import type { Shop } from "./shop";
import type { CrmMessage, CrmMessageKind, CrmStore, Lead, Quote } from "./types";

type Env = Record<string, string | undefined>;

/** Where each message kind takes its Meta template name and its Twilio content sid from. */
const TEMPLATE_VARS: Record<CrmMessageKind, { meta: string; twilio: string; fake: string }> = {
  quote_sent: { meta: "WHATSAPP_TEMPLATE_CRM_QUOTE", twilio: "TWILIO_CONTENT_SID_CRM_QUOTE", fake: "crm_quote" },
  crm_reminder: { meta: "WHATSAPP_TEMPLATE_CRM_REMINDER", twilio: "TWILIO_CONTENT_SID_CRM_REMINDER", fake: "crm_reminder" },
};

/** The customer's link to their quote. The key stops anyone reading other quotes by guessing numbers. */
export function publicQuoteUrl(origin: string, quote: Pick<Quote, "number" | "publicKey">) {
  return `${origin.replace(/\/+$/, "")}/tiles/crm/q/${encodeURIComponent(quote.number)}?k=${encodeURIComponent(quote.publicKey)}`;
}

/** The plain text each message says, and the variables a Twilio content template or Meta template gets, in order. */
export function crmMessageText(kind: CrmMessageKind, shop: Shop, lead: Pick<Lead, "name">, quote: Pick<Quote, "number" | "total">, link: string) {
  const name = firstName(lead.name) || "there";
  if (kind === "quote_sent") {
    return {
      text: `Hello ${name}, thank you for visiting ${shop.name}. Your quote ${quote.number} for ${formatInr(quote.total)} is ready: ${link} Prices are valid for 7 days. Call us on ${shop.phoneDisplay} with any questions.`,
      variables: [name, quote.number, formatInr(quote.total), link],
    };
  }
  return {
    text: `Hello ${name}, just checking in on your tile quote ${quote.number} from ${shop.name}. You can see it again here: ${link} Reply here or call ${shop.phoneDisplay} if you have questions.`,
    variables: [name, quote.number, link],
  };
}

/**
 * Sends a quote or a reminder on WhatsApp and logs it in the messages table. Never throws; a failed send is logged as failed.
 * Seed (demo) numbers always go through the fake sender, so the live demo never messages a stranger.
 * Logs carry the masked number and the quote number only.
 */
export async function sendCrmMessage(
  kind: CrmMessageKind,
  args: { store: CrmStore; shop: Shop; lead: Lead; quote: Quote; origin: string; env?: Env; sender?: WhatsAppSender },
): Promise<CrmMessage | null> {
  const env = args.env ?? process.env;
  const { lead, quote } = args;
  const to = `91${lead.phone}`;
  const link = publicQuoteUrl(env.WHATSAPP_PUBLIC_URL || args.origin, quote);
  const { text, variables } = crmMessageText(kind, args.shop, lead, quote, link);
  try {
    const demoNumber = SEED_PHONES.has(lead.phone);
    const sender = demoNumber ? fakeSender : (args.sender ?? getWhatsApp(env));
    const provider = providerOf(sender);
    const metaTemplate = env[TEMPLATE_VARS[kind].meta]?.trim() || HELLO_WORLD;
    const contentSid = provider === "twilio" ? env[TEMPLATE_VARS[kind].twilio]?.trim() || undefined : undefined;
    const contentVariables = Object.fromEntries(variables.map((v, i) => [String(i + 1), v]));
    if (demoNumber) console.log(`crm: ${kind} for ${quote.number} to a demo number, fake sender only`);
    else if (provider === "twilio")
      console.log(`crm: ${kind} for ${quote.number} via twilio as ${contentSid ? `content ${contentSid}` : `text (no ${TEMPLATE_VARS[kind].twilio})`}`);
    else if (provider === "meta") console.log(`crm: ${kind} for ${quote.number} via meta as template ${metaTemplate}`);
    const result = await sender.sendTemplate({
      to,
      template: provider === "fake" ? TEMPLATE_VARS[kind].fake : metaTemplate,
      // hello_world takes no parameters. A custom Meta template gets the same variables, in order.
      components: provider === "meta" && metaTemplate !== HELLO_WORLD ? [{ type: "body", parameters: variables.map((v) => ({ type: "text" as const, text: v })) }] : undefined,
      text,
      ...(contentSid ? { contentSid, contentVariables } : {}),
    });
    if (!result.ok) console.error(`crm: ${kind} for ${quote.number} failed via ${provider}: ${result.error ?? "unknown error"}`);
    return await args.store.logMessage({
      leadId: lead.id,
      quoteId: quote.id,
      kind,
      provider,
      toMasked: maskNumber(to),
      template: provider === "twilio" ? (contentSid ?? "text") : provider === "meta" ? metaTemplate : TEMPLATE_VARS[kind].fake,
      providerMessageId: result.messageId ?? null,
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : (result.error ?? "unknown error"),
    });
  } catch (err) {
    console.error(`crm: ${kind} for ${quote.number} not logged: ${err instanceof Error ? err.message : "unknown error"}`);
    return null;
  }
}
