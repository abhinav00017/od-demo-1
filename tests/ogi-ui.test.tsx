import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MotionProvider } from "@/demos/lotus-clinic/Motion";
import { OgiBubble } from "@/demos/lotus-clinic/OgiBubble";
import { CONSENT_TEXT_V1 } from "@/lib/bookings/consent";

function mount(withBar = true) {
  return render(
    <MotionProvider>
      <OgiBubble page="lotus-clinic" withBar={withBar} />
    </MotionProvider>,
  );
}

function stubFetch(handler: (url: string, init?: RequestInit) => unknown) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => ({ json: async () => handler(url, init) }) as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("Ogi chat bubble", () => {
  it("is a 56px white circle with the clinic Ogi, placed above the mobile bar and the desktop buttons", () => {
    stubFetch(() => ({}));
    mount();
    const button = screen.getByRole("button", { name: /chat with ogi/i });
    for (const c of ["fixed", "size-14", "rounded-full", "bg-white", "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]", "lg:bottom-[10rem]"]) {
      expect(button.className.split(/\s+/), c).toContain(c);
    }
    const img = button.querySelector("img")!;
    expect(img.getAttribute("src")).toContain("/brand/ogi-clinic.svg");
    expect(img.getAttribute("width")).toBe("40");
    expect(button.className).not.toMatch(/bg-brand\b|bg-brand-strong/);
  });

  it("sits at the bottom corner on pages without the bar", () => {
    stubFetch(() => ({}));
    mount(false);
    const button = screen.getByRole("button", { name: /chat with ogi/i });
    expect(button.className.split(/\s+/)).toContain("lg:bottom-6");
  });

  it("opens with the keyboard and shows 'Ogi is resting' when no key is set", async () => {
    const fetchFn = stubFetch(() => ({ ok: true, awake: false }));
    mount();
    const button = screen.getByRole("button", { name: /chat with ogi/i });
    button.focus();
    fireEvent.click(button);
    expect(await screen.findByText("Ogi is resting")).toBeTruthy();
    expect(fetchFn).toHaveBeenCalledWith("/api/ogi/chat?page=lotus-clinic", expect.anything());
    const dialog = screen.getByRole("dialog", { name: "Ogi" });
    expect(dialog.querySelector('a[href^="https://wa.me/"]')).toBeTruthy();
    // Focus moved into the panel; Escape closes it and gives focus back to the button.
    await waitFor(() => expect(document.activeElement?.textContent).toContain("Close chat"));
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(button);
  });

  it("chats, then shows the summary with Confirm and the booking form's consent line", async () => {
    const card = {
      token: "t.sig",
      expiresAt: Date.now() + 60_000,
      consentText: CONSENT_TEXT_V1,
      summary: { name: "Priya Sharma", phone: "9876543210", visitType: "Clinic visit", day: "Thu, 22 Oct", slot: "Morning, 10 am – 1 pm", reason: "Pregnancy care" },
    };
    const fetchFn = stubFetch((url, init) => {
      if (url.startsWith("/api/ogi/chat?")) return { ok: true, awake: true, greeting: "Hi, I'm Ogi." };
      if (url === "/api/ogi/chat") return { ok: true, kind: "answer", reply: "Please check and press Confirm.", confirm: card };
      if (url === "/api/ogi/confirm") return { ok: true, ref: "ABCD1234", sent: init?.body };
      return {};
    });
    mount();
    fireEvent.click(screen.getByRole("button", { name: /chat with ogi/i }));
    const input = await screen.findByLabelText("Message Ogi");
    await waitFor(() => expect((input as HTMLTextAreaElement).disabled).toBe(false));
    fireEvent.change(input, { target: { value: "Book Thursday morning" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(await screen.findByText("Please check and press Confirm.")).toBeTruthy();
    const sent = JSON.parse(fetchFn.mock.calls.find((c) => c[0] === "/api/ogi/chat")![1]!.body as string);
    expect(sent).toEqual({ page: "lotus-clinic", messages: [{ role: "user", content: "Book Thursday morning" }] });
    expect(screen.getByText(CONSENT_TEXT_V1)).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });
    expect(await screen.findByText(/Your reference is ABCD1234/)).toBeTruthy();
    const confirmBody = JSON.parse(fetchFn.mock.calls.find((c) => c[0] === "/api/ogi/confirm")![1]!.body as string);
    expect(confirmBody.token).toBe("t.sig");
  });
});
