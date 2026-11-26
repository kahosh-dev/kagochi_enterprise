import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_VACCINES } from "../src/vaccineDefaults.js";
import { vaccineSchema } from "../src/schemas.js";

describe("Vaccine Reference Table & Seeds Verification", () => {
  it("includes all required default vaccines for poultry and cattle", () => {
    const poultryVaccines = DEFAULT_VACCINES.filter((v) => v.species === "poultry");
    const cattleVaccines = DEFAULT_VACCINES.filter((v) => v.species === "cattle");

    assert.equal(poultryVaccines.length, 8, "Expected 8 default poultry vaccines");
    assert.equal(cattleVaccines.length, 9, "Expected 9 default cattle vaccines");

    // Check specific poultry vaccines
    const poultryNames = poultryVaccines.map((v) => v.name);
    assert.ok(poultryNames.some((n) => n.includes("Newcastle disease")));
    assert.ok(poultryNames.some((n) => n.includes("Gumboro")));
    assert.ok(poultryNames.some((n) => n.includes("Marek's disease")));
    assert.ok(poultryNames.some((n) => n.includes("Fowl pox")));
    assert.ok(poultryNames.some((n) => n.includes("Infectious bronchitis")));
    assert.ok(poultryNames.some((n) => n.includes("Fowl typhoid")));
    assert.ok(poultryNames.some((n) => n.includes("Infectious coryza")));
    assert.ok(poultryNames.some((n) => n.includes("Fowl cholera")));

    // Check specific cattle vaccines
    const cattleNames = cattleVaccines.map((v) => v.name);
    assert.ok(cattleNames.some((n) => n.includes("Foot-and-mouth disease")));
    assert.ok(cattleNames.some((n) => n.includes("Lumpy skin disease")));
    assert.ok(cattleNames.some((n) => n.includes("Anthrax")));
    assert.ok(cattleNames.some((n) => n.includes("Blackquarter")));
    assert.ok(cattleNames.some((n) => n.includes("East Coast fever")));
    assert.ok(cattleNames.some((n) => n.includes("Brucellosis")));
    assert.ok(cattleNames.some((n) => n.includes("Rift Valley fever")));
    assert.ok(cattleNames.some((n) => n.includes("Contagious bovine pleuropneumonia")));
    assert.ok(cattleNames.some((n) => n.includes("Rabies")));
  });

  it("validates vaccine records against vaccineSchema", () => {
    const valid = vaccineSchema.safeParse({
      species: "poultry",
      name: "Newcastle LaSota",
      disease: "Newcastle Disease",
      defaultMethod: "Drinking water",
      notes: "Follow vet instructions",
      isActive: 1,
    });
    assert.ok(valid.success);

    const invalid = vaccineSchema.safeParse({
      species: "sheep", // invalid species
      name: "",
      disease: "",
    });
    assert.equal(invalid.success, false);
  });
});
