import { describe, expect, it } from "vitest";
import { toPlainText } from "@/lib/ogi/plainText";

describe("Ogi replies become plain text", () => {
  it.each([
    ["Please press the **Confirm** button.", "Please press the Confirm button."],
    ["We are open ***Monday to Saturday***.", "We are open Monday to Saturday."],
    ["Visits are __by appointment__.", "Visits are by appointment."],
    ["Sundays are *online only*.", "Sundays are online only."],
    ["Sundays are _online only_.", "Sundays are online only."],
    ["## Timings\nWe open at 10 am.", "Timings\nWe open at 10 am."],
    ["- Pregnancy care\n- Fertility\n* Gynecology", "• Pregnancy care\n• Fertility\n• Gynecology"],
    ["Book [on this page](https://od-demo-lyart.vercel.app/clinic/website/book).", "Book on this page."],
    ["Mornings are `10 am – 1 pm`.", "Mornings are 10 am – 1 pm."],
    ["Line one\n\n\n\nLine two", "Line one\n\nLine two"],
  ])("%j", (input, expected) => {
    expect(toPlainText(input)).toBe(expected);
  });

  it.each([
    "We are open Monday to Saturday, 10 am to 7 pm. Online consultations are ₹500.",
    "1. Pick a day\n2. Pick a time",
    "Call us on +91 73821 30063 or email care@lotusclinic.in.",
    "Visit https://od-demo-lyart.vercel.app/clinic/website/book to book.",
    "5 - 7 pm works, and so does 10 am - 1 pm.",
  ])("leaves plain text alone: %j", (input) => {
    expect(toPlainText(input)).toBe(input);
  });

  it("never leaves an asterisk pair behind", () => {
    expect(toPlainText("Press **Confirm** and then **wait for WhatsApp**")).not.toContain("*");
  });
});
