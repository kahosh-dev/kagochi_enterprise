export interface DefaultFeedType {
  animal_type: "poultry" | "cattle";
  category: string;
  name: string;
  default_unit: "kg" | "bags" | "bales" | "wheelbarrows" | "litres";
}

export const DEFAULT_FEED_TYPES: DefaultFeedType[] = [
  // Poultry Feeds
  { animal_type: "poultry", category: "Complete feeds", name: "Chick mash", default_unit: "kg" },
  { animal_type: "poultry", category: "Complete feeds", name: "Growers mash", default_unit: "kg" },
  { animal_type: "poultry", category: "Complete feeds", name: "Layers mash", default_unit: "kg" },
  { animal_type: "poultry", category: "Complete feeds", name: "Broiler starter", default_unit: "kg" },
  { animal_type: "poultry", category: "Complete feeds", name: "Broiler grower", default_unit: "kg" },
  { animal_type: "poultry", category: "Complete feeds", name: "Broiler finisher", default_unit: "kg" },
  { animal_type: "poultry", category: "Complete feeds", name: "Kienyeji / indigenous feed", default_unit: "kg" },
  { animal_type: "poultry", category: "Grains & Energy", name: "Whole maize", default_unit: "kg" },
  { animal_type: "poultry", category: "Grains & Energy", name: "Maize germ / bran", default_unit: "kg" },
  { animal_type: "poultry", category: "Proteins", name: "Fish meal / omena", default_unit: "kg" },
  { animal_type: "poultry", category: "Minerals & Supplements", name: "Grit", default_unit: "kg" },
  { animal_type: "poultry", category: "Minerals & Supplements", name: "Oyster shell / limestone (calcium)", default_unit: "kg" },
  { animal_type: "poultry", category: "Minerals & Supplements", name: "Vitamin/mineral premix", default_unit: "kg" },
  { animal_type: "poultry", category: "Supplementary & Forage", name: "Kitchen leftovers", default_unit: "kg" },

  // Cattle - Concentrates
  { animal_type: "cattle", category: "Concentrates", name: "Dairy meal", default_unit: "kg" },
  { animal_type: "cattle", category: "Concentrates", name: "Calf starter / pellets", default_unit: "kg" },
  { animal_type: "cattle", category: "Concentrates", name: "Milk replacer", default_unit: "kg" },
  { animal_type: "cattle", category: "Concentrates", name: "Maize germ", default_unit: "kg" },
  { animal_type: "cattle", category: "Concentrates", name: "Wheat bran", default_unit: "kg" },
  { animal_type: "cattle", category: "Concentrates", name: "Cottonseed cake", default_unit: "kg" },
  { animal_type: "cattle", category: "Concentrates", name: "Sunflower cake", default_unit: "kg" },
  { animal_type: "cattle", category: "Concentrates", name: "Brewers' grains", default_unit: "kg" },

  // Cattle - Fodder and roughage
  { animal_type: "cattle", category: "Fodder and roughage", name: "Napier grass", default_unit: "kg" },
  { animal_type: "cattle", category: "Fodder and roughage", name: "Maize silage", default_unit: "kg" },
  { animal_type: "cattle", category: "Fodder and roughage", name: "Napier silage", default_unit: "kg" },
  { animal_type: "cattle", category: "Fodder and roughage", name: "Hay (Rhodes grass)", default_unit: "bales" },
  { animal_type: "cattle", category: "Fodder and roughage", name: "Lucerne (alfalfa)", default_unit: "bales" },
  { animal_type: "cattle", category: "Fodder and roughage", name: "Maize stover", default_unit: "bales" },
  { animal_type: "cattle", category: "Fodder and roughage", name: "Desmodium", default_unit: "kg" },
  { animal_type: "cattle", category: "Fodder and roughage", name: "Sweet potato vines", default_unit: "kg" },
  { animal_type: "cattle", category: "Fodder and roughage", name: "Boma Rhodes", default_unit: "bales" },
  { animal_type: "cattle", category: "Fodder and roughage", name: "Fresh pasture/grazing", default_unit: "kg" },

  // Cattle - Supplements
  { animal_type: "cattle", category: "Supplements", name: "Molasses", default_unit: "litres" },
  { animal_type: "cattle", category: "Supplements", name: "Mineral lick / salt lick", default_unit: "kg" },
  { animal_type: "cattle", category: "Supplements", name: "Dairy mineral premix", default_unit: "kg" },
];
