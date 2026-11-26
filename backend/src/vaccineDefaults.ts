export interface DefaultVaccine {
  species: "poultry" | "cattle";
  name: string;
  disease: string;
  default_method: string;
  notes: string;
}

export const DEFAULT_VACCINES: DefaultVaccine[] = [
  // Poultry
  {
    species: "poultry",
    name: "Newcastle disease (Hitchner B1, LaSota, I-2 thermostable)",
    disease: "Newcastle Disease",
    default_method: "Eye drop, drinking water or spray",
    notes: "Confirm schedule and dose with a veterinarian.",
  },
  {
    species: "poultry",
    name: "Gumboro / Infectious Bursal Disease (IBD)",
    disease: "Gumboro / Infectious Bursal Disease (IBD)",
    default_method: "Drinking water or eye drop",
    notes: "Confirm schedule and dose with a veterinarian.",
  },
  {
    species: "poultry",
    name: "Marek's disease",
    disease: "Marek's Disease",
    default_method: "Injection at hatchery",
    notes: "Administered at day-old at the hatchery.",
  },
  {
    species: "poultry",
    name: "Fowl pox",
    disease: "Fowl Pox",
    default_method: "Wing-web stab",
    notes: "Administer via wing-web applicator.",
  },
  {
    species: "poultry",
    name: "Infectious bronchitis (IB)",
    disease: "Infectious Bronchitis (IB)",
    default_method: "Drinking water or spray",
    notes: "Confirm schedule and dose with a veterinarian.",
  },
  {
    species: "poultry",
    name: "Fowl typhoid",
    disease: "Fowl Typhoid",
    default_method: "Injection",
    notes: "Confirm schedule and dose with a veterinarian.",
  },
  {
    species: "poultry",
    name: "Infectious coryza",
    disease: "Infectious Coryza",
    default_method: "Injection",
    notes: "Confirm schedule and dose with a veterinarian.",
  },
  {
    species: "poultry",
    name: "Fowl cholera",
    disease: "Fowl Cholera",
    default_method: "Injection",
    notes: "Confirm schedule and dose with a veterinarian.",
  },

  // Cattle
  {
    species: "cattle",
    name: "Foot-and-mouth disease (FMD)",
    disease: "Foot-and-Mouth Disease (FMD)",
    default_method: "Injection",
    notes: "Routine vaccination; confirm frequency with a veterinarian.",
  },
  {
    species: "cattle",
    name: "Lumpy skin disease",
    disease: "Lumpy Skin Disease",
    default_method: "Injection",
    notes: "Annual vaccination recommended.",
  },
  {
    species: "cattle",
    name: "Anthrax",
    disease: "Anthrax",
    default_method: "Injection",
    notes: "Annual vaccination. Do not vaccinate clinically sick animals.",
  },
  {
    species: "cattle",
    name: "Blackquarter (blackleg)",
    disease: "Blackquarter (Blackleg)",
    default_method: "Injection",
    notes: "Confirm schedule and dose with a veterinarian.",
  },
  {
    species: "cattle",
    name: "East Coast fever (ECF)",
    disease: "East Coast Fever (ECF)",
    default_method: "Infection and treatment method, by a vet",
    notes: "Must be administered by a qualified veterinarian.",
  },
  {
    species: "cattle",
    name: "Brucellosis (S19, heifer calves)",
    disease: "Brucellosis",
    default_method: "By a vet",
    notes: "Heifer calves only; must be administered by a qualified veterinarian.",
  },
  {
    species: "cattle",
    name: "Rift Valley fever",
    disease: "Rift Valley Fever",
    default_method: "Injection",
    notes: "Confirm schedule and dose with a veterinarian.",
  },
  {
    species: "cattle",
    name: "Contagious bovine pleuropneumonia (CBPP)",
    disease: "Contagious Bovine Pleuropneumonia (CBPP)",
    default_method: "Injection",
    notes: "Confirm schedule and dose with a veterinarian.",
  },
  {
    species: "cattle",
    name: "Rabies",
    disease: "Rabies",
    default_method: "Injection",
    notes: "Confirm schedule and dose with a veterinarian.",
  },
];
