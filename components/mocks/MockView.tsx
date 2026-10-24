import type { Mock } from "@/lib/schema";
import { BrowserMock } from "./BrowserMock";
import { ChatMock } from "./ChatMock";
import { EventPageMock } from "./EventPageMock";
import { LeadsMock } from "./LeadsMock";
import { LoyaltyMock } from "./LoyaltyMock";
import { MapsMock } from "./MapsMock";
import { OffersMock } from "./OffersMock";
import { QrMenuMock } from "./QrMenuMock";
import { RecordsMock } from "./RecordsMock";
import { SummaryMock } from "./SummaryMock";
import { VideoMock } from "./VideoMock";

export function MockView({ mock }: { mock: Mock }) {
  switch (mock.kind) {
    case "chat":
      return <ChatMock mock={mock} />;
    case "maps":
      return <MapsMock mock={mock} />;
    case "video":
      return <VideoMock mock={mock} />;
    case "offers":
      return <OffersMock mock={mock} />;
    case "records":
      return <RecordsMock mock={mock} />;
    case "browser":
      return <BrowserMock mock={mock} />;
    case "qr-menu":
      return <QrMenuMock mock={mock} />;
    case "loyalty":
      return <LoyaltyMock mock={mock} />;
    case "summary":
      return <SummaryMock mock={mock} />;
    case "leads":
      return <LeadsMock mock={mock} />;
    case "event-page":
      return <EventPageMock mock={mock} />;
  }
}
