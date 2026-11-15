// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { schemaStatements } from "@/lib/bookings/migrations";
import { orgForSlug, ORGS, WHATSAPP_LISTS_ORG_ID } from "@/lib/orgs";
import { profileForPage } from "@/lib/ogi/profiles";

const statements = schemaStatements(readFileSync(path.join(process.cwd(), "lib/bookings/schema.sql"), "utf8"));

/** The rows the schema seeds, read from its one INSERT INTO organizations. */
function seededOrgs() {
  const insert = statements.filter((s) => s.startsWith("INSERT INTO organizations"));
  expect(insert).toHaveLength(1);
  return [...insert[0].matchAll(/\('((?:[^']|'')*)', '((?:[^']|'')*)', '((?:[^']|'')*)', '((?:[^']|'')*)'\)/g)].map(([, id, slug, name, product]) => ({
    id,
    slug,
    name: name.replace(/''/g, "'"),
    product,
  }));
}

describe("the organization list (lib/orgs.ts)", () => {
  it("matches the schema.sql seed rows exactly", () => {
    expect(seededOrgs()).toEqual(ORGS.map((o) => ({ ...o })));
    expect(seededOrgs()).toEqual([
      { id: "org_7f3k2a", slug: "lotus-clinic", name: "Lotus Women's Clinic", product: "clinic" },
      { id: "org_2m9qd1", slug: "kalyani-tiles", name: "Kalyani Tiles", product: "tiles" },
    ]);
  });

  it("gives the WhatsApp lists the same default organization as the schema", () => {
    for (const t of ["whatsapp_optouts", "whatsapp_unreachable"]) {
      const add = statements.find((s) => s.startsWith(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS org_id`))!;
      expect(add).toContain(`DEFAULT '${WHATSAPP_LISTS_ORG_ID}'`);
    }
    expect(WHATSAPP_LISTS_ORG_ID).toBe(orgForSlug("lotus-clinic")!.id);
  });

  it("finds an organization by slug, and nothing for an unknown or non-string slug", () => {
    expect(orgForSlug("lotus-clinic")).toEqual({ id: "org_7f3k2a", slug: "lotus-clinic", name: "Lotus Women's Clinic", product: "clinic" });
    expect(orgForSlug("kalyani-tiles")?.id).toBe("org_2m9qd1");
    for (const raw of ["sunrise-clinic", "org_7f3k2a", "Lotus-Clinic", "", "__proto__", null, undefined, 1]) expect(orgForSlug(raw), String(raw)).toBeUndefined();
  });

  it("keeps ids and slugs unique", () => {
    expect(new Set(ORGS.map((o) => o.id)).size).toBe(ORGS.length);
    expect(new Set(ORGS.map((o) => o.slug)).size).toBe(ORGS.length);
  });

  it("gives Ogi's Lotus page the Lotus organization, found from the page's slug on the server", () => {
    const lotus = profileForPage("lotus-clinic")!;
    expect(lotus.orgId).toBe("org_7f3k2a");
    expect(lotus.orgId).toBe(orgForSlug(lotus.key)!.id);
  });
});
