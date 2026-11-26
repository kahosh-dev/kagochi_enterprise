import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getNairobiToday,
  getDaysBetween,
  getWeeksBetween,
  getCalendarMonthsBetween,
  estimateBirthDateFromAge,
  formatAnimalAge,
  getPoultryLifeStage,
  getCattleLifeStage,
  compareAgeByDate,
  FARM_TIMEZONE,
} from "../src/age.js";
import { LIFE_STAGE_CONFIG } from "../src/lifeStages.js";

describe("Age Calculation & Life Stage Engine", () => {
  describe("Africa/Nairobi Time Zone", () => {
    it("reports Africa/Nairobi timezone constant", () => {
      assert.equal(FARM_TIMEZONE, "Africa/Nairobi");
    });

    it("accurately computes the calendar date in Africa/Nairobi (UTC+3)", () => {
      // 2026-11-26 at 22:30:00 UTC is 2026-11-27 at 01:30:00 in Nairobi (UTC+3)
      const lateNightUtc = new Date("2026-11-26T22:30:00Z");
      const nairobiDate = getNairobiToday(lateNightUtc);
      assert.equal(nairobiDate, "2026-11-27");

      // 2026-11-26 at 20:00:00 UTC is 2026-11-26 at 23:00:00 in Nairobi
      const earlyEveningUtc = new Date("2026-11-26T20:00:00Z");
      assert.equal(getNairobiToday(earlyEveningUtc), "2026-11-26");
    });
  });

  describe("Leap Years", () => {
    it("calculates age accurately across leap year boundaries", () => {
      const leapBirth = "2024-02-29";

      // On 2025-02-27 (day before month end in non-leap year): 11 months
      assert.equal(getCalendarMonthsBetween(leapBirth, "2025-02-27"), 11);

      // On 2025-02-28 (month end in non-leap year): reaches full 12 months (1 yr)
      assert.equal(getCalendarMonthsBetween(leapBirth, "2025-02-28"), 12);

      // On 2026-02-28: reaches full 24 months (2 yrs)
      assert.equal(getCalendarMonthsBetween(leapBirth, "2026-02-28"), 24);

      // On 2028-02-29 (next leap day): reaches 48 months (4 yrs)
      assert.equal(getCalendarMonthsBetween(leapBirth, "2028-02-29"), 48);

      const formatted = formatAnimalAge(leapBirth, "cattle", { asOfDate: "2026-02-28" });
      assert.equal(formatted.formatted, "2 yrs 0 mos");
    });
  });

  describe("Month Ends", () => {
    it("handles month-end transitions for 31-day and 30-day months", () => {
      const jan31 = "2026-01-31";

      // Jan 31 to Feb 27: 27 days (under 1 month)
      assert.equal(getCalendarMonthsBetween(jan31, "2026-02-27"), 0);
      assert.equal(getDaysBetween(jan31, "2026-02-27"), 27);

      // Jan 31 to Feb 28 (last day of Feb): reaches 1 full month
      assert.equal(getCalendarMonthsBetween(jan31, "2026-02-28"), 1);

      // Jan 31 to March 30: 1 month
      assert.equal(getCalendarMonthsBetween(jan31, "2026-03-30"), 1);

      // Jan 31 to March 31: reaches 2 full months
      assert.equal(getCalendarMonthsBetween(jan31, "2026-03-31"), 2);

      // March 31 to April 30: reaches 1 full month
      assert.equal(getCalendarMonthsBetween("2026-03-31", "2026-04-30"), 1);

      // August 31 to September 30: reaches 1 full month
      assert.equal(getCalendarMonthsBetween("2026-08-31", "2026-09-30"), 1);
      assert.equal(getCalendarMonthsBetween("2026-08-31", "2026-09-29"), 0);
    });
  });

  describe("Estimated Dates Conversion", () => {
    const today = "2026-11-26";

    it("converts days to estimated birth date", () => {
      const dob = estimateBirthDateFromAge(10, "days", today);
      assert.equal(dob, "2026-11-16");
      assert.equal(getDaysBetween(dob, today), 10);
    });

    it("converts weeks to estimated birth date", () => {
      const dob = estimateBirthDateFromAge(5, "weeks", today);
      assert.equal(dob, "2026-10-22");
      assert.equal(getWeeksBetween(dob, today), 5);
    });

    it("converts months to estimated birth date", () => {
      const dob = estimateBirthDateFromAge(3, "months", today);
      assert.equal(dob, "2026-08-26");
      assert.equal(getCalendarMonthsBetween(dob, today), 3);
    });

    it("converts years to estimated birth date", () => {
      const dob = estimateBirthDateFromAge(2.5, "years", today);
      // 2 years and 6 months before 2026-11-26 is 2024-05-26
      assert.equal(dob, "2024-05-26");
      assert.equal(getCalendarMonthsBetween(dob, today), 30);
    });

    it("clamps to valid month end when subtracting months from 31st", () => {
      // 3 months before May 31 lands in February (28 days in non-leap year)
      const dob = estimateBirthDateFromAge(3, "months", "2026-05-31");
      assert.equal(dob, "2026-02-28");
    });
  });

  describe("Readable Age Formatting for Poultry", () => {
    const today = "2026-11-26";

    it("formats days under 3 weeks (< 21 days)", () => {
      assert.equal(formatAnimalAge("2026-11-26", "poultry", { asOfDate: today }).formatted, "0 days");
      assert.equal(formatAnimalAge("2026-11-25", "poultry", { asOfDate: today }).formatted, "1 day");
      assert.equal(formatAnimalAge("2026-11-21", "poultry", { asOfDate: today }).formatted, "5 days");
      assert.equal(formatAnimalAge("2026-11-12", "poultry", { asOfDate: today }).formatted, "14 days");
      assert.equal(formatAnimalAge("2026-11-06", "poultry", { asOfDate: today }).formatted, "20 days");
    });

    it("formats weeks under 6 months (>= 21 days and < 6 months)", () => {
      // 21 days = 3 weeks
      assert.equal(formatAnimalAge("2026-11-05", "poultry", { asOfDate: today }).formatted, "3 weeks");
      // 35 days = 5 weeks
      assert.equal(formatAnimalAge("2026-10-22", "poultry", { asOfDate: today }).formatted, "5 weeks");
      // 12 weeks
      assert.equal(formatAnimalAge("2026-09-03", "poultry", { asOfDate: today }).formatted, "12 weeks");
    });

    it("formats months for 6 months and older", () => {
      // 6 months before today: 2026-05-26
      assert.equal(formatAnimalAge("2026-05-26", "poultry", { asOfDate: today }).formatted, "6 months");
      // 8 months before today: 2026-03-26
      assert.equal(formatAnimalAge("2026-03-26", "poultry", { asOfDate: today }).formatted, "8 months");
      // 14 months before today: 2025-09-26
      assert.equal(formatAnimalAge("2025-09-26", "poultry", { asOfDate: today }).formatted, "14 months");
    });
  });

  describe("Readable Age Formatting for Cattle", () => {
    const today = "2026-11-26";

    it("formats days or weeks under 3 months", () => {
      // Under 14 days: days
      assert.equal(formatAnimalAge("2026-11-21", "cattle", { asOfDate: today }).formatted, "5 days");
      assert.equal(formatAnimalAge("2026-11-14", "cattle", { asOfDate: today }).formatted, "12 days");

      // 14 days to under 3 months: weeks
      assert.equal(formatAnimalAge("2026-11-12", "cattle", { asOfDate: today }).formatted, "2 weeks");
      assert.equal(formatAnimalAge("2026-10-01", "cattle", { asOfDate: today }).formatted, "8 weeks");
      assert.equal(formatAnimalAge("2026-09-10", "cattle", { asOfDate: today }).formatted, "11 weeks");
    });

    it("formats months under 2 years (3 months to < 24 months)", () => {
      // 3 months
      assert.equal(formatAnimalAge("2026-08-26", "cattle", { asOfDate: today }).formatted, "3 months");
      // 8 months
      assert.equal(formatAnimalAge("2026-03-26", "cattle", { asOfDate: today }).formatted, "8 months");
      // 18 months
      assert.equal(formatAnimalAge("2025-05-26", "cattle", { asOfDate: today }).formatted, "18 months");
      // 23 months
      assert.equal(formatAnimalAge("2024-12-26", "cattle", { asOfDate: today }).formatted, "23 months");
    });

    it("formats years and months for 2+ years (for example '2 yrs 3 mos')", () => {
      // 24 months (2 yrs 0 mos)
      assert.equal(formatAnimalAge("2024-11-26", "cattle", { asOfDate: today }).formatted, "2 yrs 0 mos");
      // 27 months (2 yrs 3 mos)
      assert.equal(formatAnimalAge("2024-08-26", "cattle", { asOfDate: today }).formatted, "2 yrs 3 mos");
      // 40 months (3 yrs 4 mos)
      assert.equal(formatAnimalAge("2023-07-26", "cattle", { asOfDate: today }).formatted, "3 yrs 4 mos");
    });
  });

  describe("Sold or Dead Animals Event-Based Age", () => {
    it("calculates age at the time of the event, not today", () => {
      const birthDate = "2024-01-10";
      const saleDate = "2025-05-10"; // Exactly 1 yr 4 mos old at sale

      const ageAtSale = formatAnimalAge(birthDate, "cattle", {
        asOfDate: saleDate,
        eventType: "sale",
      });

      assert.equal(ageAtSale.formatted, "16 months (at sale)");
      assert.equal(ageAtSale.isHistorical, true);
      assert.equal(ageAtSale.eventContext, "at sale");

      const deathDate = "2024-09-10"; // 8 months old at death
      const ageAtDeath = formatAnimalAge(birthDate, "cattle", {
        asOfDate: deathDate,
        eventType: "death",
      });
      assert.equal(ageAtDeath.formatted, "8 months (at death)");
      assert.equal(ageAtDeath.isHistorical, true);
    });
  });

  describe("Life Stage Labels and Configurable Thresholds", () => {
    const today = "2026-11-26";

    it("categorizes poultry: chick (0-8 wks), grower (8-18 wks), layer (18+ wks)", () => {
      // 4 weeks old -> chick
      const chick = getPoultryLifeStage("2026-10-29", "layers", today);
      assert.equal(chick.id, "chick");
      assert.equal(chick.name, "Chick");

      // 12 weeks old -> grower
      const grower = getPoultryLifeStage("2026-09-03", "layers", today);
      assert.equal(grower.id, "grower");
      assert.equal(grower.name, "Grower");

      // 20 weeks old -> layer
      const layer = getPoultryLifeStage("2026-07-09", "layers", today);
      assert.equal(layer.id, "layer");
      assert.equal(layer.name, "Layer");
    });

    it("flags broilers as 'ready for sale' around configured age (>= 6 weeks)", () => {
      // 4 weeks old broiler -> not yet ready for sale
      const youngBroiler = getPoultryLifeStage("2026-10-29", "broilers (meat)", today);
      assert.equal(youngBroiler.readyForSale, undefined);

      // 6 weeks old broiler -> ready for sale
      const readyBroiler = getPoultryLifeStage("2026-10-15", "broilers (meat)", today);
      assert.equal(readyBroiler.id, "broiler_ready");
      assert.equal(readyBroiler.name, "Ready for sale");
      assert.equal(readyBroiler.readyForSale, true);
    });

    it("categorizes cattle: calf (0-6 mos), heifer/young bull (6-24 mos), cow/bull (24+ mos)", () => {
      // 4 months female -> calf
      const calf = getCattleLifeStage("2026-07-26", "female", today);
      assert.equal(calf.id, "calf");
      assert.equal(calf.name, "Calf");

      // 12 months female -> heifer
      const heifer = getCattleLifeStage("2025-11-26", "female", today);
      assert.equal(heifer.id, "heifer");
      assert.equal(heifer.name, "Heifer");

      // 12 months male -> young bull
      const youngBull = getCattleLifeStage("2025-11-26", "male", today);
      assert.equal(youngBull.id, "young_bull");
      assert.equal(youngBull.name, "Young Bull");

      // 30 months female -> cow
      const cow = getCattleLifeStage("2024-05-26", "female", today);
      assert.equal(cow.id, "cow");
      assert.equal(cow.name, "Cow");

      // 30 months male -> bull
      const bull = getCattleLifeStage("2024-05-26", "male", today);
      assert.equal(bull.id, "bull");
      assert.equal(bull.name, "Bull");
    });
  });

  describe("Sorting by Age Uses Date Not Formatted Text", () => {
    it("sorts chronologically by underlying date", () => {
      // "2 yrs 3 mos" (born 2024-08-26) vs "8 months" (born 2026-03-26) vs "5 weeks" (born 2026-10-22)
      // Alphabetical order of formatted text would be: "2 yrs 3 mos" < "5 weeks" < "8 months".
      // But chronological order (descending = oldest first) must be:
      // 2024-08-26 (oldest) -> 2026-03-26 -> 2026-10-22 (youngest).
      const animals = [
        { name: "Youngest", dob: "2026-10-22" },
        { name: "Oldest", dob: "2024-08-26" },
        { name: "Middle", dob: "2026-03-26" },
      ];

      // Sort descending (oldest first)
      animals.sort((a, b) => compareAgeByDate(a.dob, b.dob, "desc"));
      assert.equal(animals[0].name, "Oldest");
      assert.equal(animals[1].name, "Middle");
      assert.equal(animals[2].name, "Youngest");

      // Sort ascending (youngest first)
      animals.sort((a, b) => compareAgeByDate(a.dob, b.dob, "asc"));
      assert.equal(animals[0].name, "Youngest");
      assert.equal(animals[1].name, "Middle");
      assert.equal(animals[2].name, "Oldest");
    });
  });
});
