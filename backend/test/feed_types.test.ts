import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FEED_TYPES } from "../src/feedTypeDefaults.js";
import { feedTypeSchema, FEED_UNITS } from "../src/schemas.js";

describe("Feed Types Reference Table & Seeds Verification", () => {
  it("includes all required seed values for poultry and cattle feeds", () => {
    const poultryFeeds = DEFAULT_FEED_TYPES.filter((f) => f.animal_type === "poultry");
    const cattleFeeds = DEFAULT_FEED_TYPES.filter((f) => f.animal_type === "cattle");

    assert.ok(poultryFeeds.length >= 14, "Expected at least 14 poultry feeds");
    assert.ok(cattleFeeds.length >= 21, "Expected at least 21 cattle feeds");

    // Poultry feed checks
    const pNames = poultryFeeds.map((f) => f.name);
    assert.ok(pNames.includes("Chick mash"));
    assert.ok(pNames.includes("Growers mash"));
    assert.ok(pNames.includes("Layers mash"));
    assert.ok(pNames.includes("Broiler starter"));
    assert.ok(pNames.includes("Broiler grower"));
    assert.ok(pNames.includes("Broiler finisher"));
    assert.ok(pNames.includes("Kienyeji / indigenous feed"));
    assert.ok(pNames.includes("Whole maize"));
    assert.ok(pNames.includes("Maize germ / bran"));
    assert.ok(pNames.includes("Fish meal / omena"));
    assert.ok(pNames.includes("Grit"));
    assert.ok(pNames.includes("Oyster shell / limestone (calcium)"));
    assert.ok(pNames.includes("Vitamin/mineral premix"));
    assert.ok(pNames.includes("Kitchen leftovers"));

    // Cattle feed checks
    const cNames = cattleFeeds.map((f) => f.name);
    // Concentrates
    assert.ok(cNames.includes("Dairy meal"));
    assert.ok(cNames.includes("Calf starter / pellets"));
    assert.ok(cNames.includes("Milk replacer"));
    assert.ok(cNames.includes("Maize germ"));
    assert.ok(cNames.includes("Wheat bran"));
    assert.ok(cNames.includes("Cottonseed cake"));
    assert.ok(cNames.includes("Sunflower cake"));
    assert.ok(cNames.includes("Brewers' grains"));
    // Fodder and roughage
    assert.ok(cNames.includes("Napier grass"));
    assert.ok(cNames.includes("Maize silage"));
    assert.ok(cNames.includes("Napier silage"));
    assert.ok(cNames.includes("Hay (Rhodes grass)"));
    assert.ok(cNames.includes("Lucerne (alfalfa)"));
    assert.ok(cNames.includes("Maize stover"));
    assert.ok(cNames.includes("Desmodium"));
    assert.ok(cNames.includes("Sweet potato vines"));
    assert.ok(cNames.includes("Boma Rhodes"));
    assert.ok(cNames.includes("Fresh pasture/grazing"));
    // Supplements
    assert.ok(cNames.includes("Molasses"));
    assert.ok(cNames.includes("Mineral lick / salt lick"));
    assert.ok(cNames.includes("Dairy mineral premix"));

    // Default units check
    const hay = cattleFeeds.find((f) => f.name === "Hay (Rhodes grass)");
    assert.equal(hay?.default_unit, "bales");

    const molasses = cattleFeeds.find((f) => f.name === "Molasses");
    assert.equal(molasses?.default_unit, "litres");

    const dairyMeal = cattleFeeds.find((f) => f.name === "Dairy meal");
    assert.equal(dairyMeal?.default_unit, "kg");
  });

  it("verifies FEED_UNITS contains kg, bags, bales, wheelbarrows, litres", () => {
    assert.ok(FEED_UNITS.includes("kg"));
    assert.ok(FEED_UNITS.includes("bags"));
    assert.ok(FEED_UNITS.includes("bales"));
    assert.ok(FEED_UNITS.includes("wheelbarrows"));
    assert.ok(FEED_UNITS.includes("litres"));
  });

  it("validates feed type records against feedTypeSchema", () => {
    const valid = feedTypeSchema.safeParse({
      animalType: "cattle",
      category: "Concentrates",
      name: "Special Dairy Meal",
      defaultUnit: "kg",
      isActive: 1,
    });
    assert.ok(valid.success);

    const invalid = feedTypeSchema.safeParse({
      animalType: "goats", // invalid animalType
      category: "",
      name: "",
    });
    assert.equal(invalid.success, false);
  });
});
