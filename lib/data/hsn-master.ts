/**
 * HSN/SAC Master Data - Unified lookup for all GST codes
 * 
 * This file provides hierarchical lookup functions that combine:
 * - Chapters (2-digit): 99 chapters from hsn-chapters.ts
 * - Headings (4-digit): ~600+ headings from hsn-headings files
 * - SAC codes (6-digit): 300+ service codes from sac-master.ts
 * 
 * HSN Structure:
 * - First 2 digits: Chapter (Section/Category)
 * - Next 2 digits: Heading (Sub-category)
 * - Next 2 digits: Sub-heading (Detailed classification)
 * - Last 2 digits: Tariff item (India-specific, 8-digit)
 * 
 * The lookup functions cascade from most specific to least specific,
 * building composite descriptions when exact matches aren't found.
 */

import { HSN_CHAPTERS, getChapterInfo, type HSNChapter } from './hsn-chapters';
import { HSN_HEADINGS, type HSNHeading } from './hsn-headings';
import HSN_HEADINGS_PART2 from './hsn-headings-2';
import HSN_HEADINGS_PART3 from './hsn-headings-3';
import HSN_HEADINGS_PART4 from './hsn-headings-4';
import { SAC_GROUPS, SAC_SERVICES, getSACGroupInfo, getSACServiceInfo, type SACEntry } from './sac-master';

// Re-export types
export type { HSNChapter, HSNHeading, SACEntry };

// Legacy HSNEntry interface for backward compatibility
export interface HSNEntry {
    code: string;
    description: string;
    gstRate?: number;
}

// Combine all HSN headings into one lookup
const ALL_HSN_HEADINGS: Record<string, HSNHeading> = {
    ...HSN_HEADINGS,
    ...HSN_HEADINGS_PART2,
    ...HSN_HEADINGS_PART3,
    ...HSN_HEADINGS_PART4,
};

// Common sub-headings (6-digit) for frequently used categories
const HSN_SUBHEADINGS: Record<string, HSNEntry> = {
    // Electronics & Computing
    "847130": { code: "847130", description: "Portable automatic data processing machines (laptops)", gstRate: 18 },
    "847141": { code: "847141", description: "Data processing machines with CPU, input and output in same housing", gstRate: 18 },
    "847149": { code: "847149", description: "Other data processing machines (desktops)", gstRate: 18 },
    "847150": { code: "847150", description: "Processing units (CPUs)", gstRate: 18 },
    "847160": { code: "847160", description: "Input or output units (keyboards, monitors, printers)", gstRate: 18 },
    "847170": { code: "847170", description: "Storage units (hard drives, SSDs)", gstRate: 18 },
    "847180": { code: "847180", description: "Other units of automatic data processing machines", gstRate: 18 },
    "851712": { code: "851712", description: "Mobile phones for cellular networks", gstRate: 18 },
    "851762": { code: "851762", description: "Machines for sending/receiving voice, images, or data (routers)", gstRate: 18 },
    "852871": { code: "852871", description: "Reception apparatus for television, not incorporating video display", gstRate: 28 },
    "852872": { code: "852872", description: "Reception apparatus for television, colour, incorporating video display", gstRate: 28 },

    // Bearings and Mechanical Parts
    "848210": { code: "848210", description: "Ball bearings", gstRate: 18 },
    "848220": { code: "848220", description: "Tapered roller bearings", gstRate: 18 },
    "848230": { code: "848230", description: "Spherical roller bearings", gstRate: 18 },
    "848240": { code: "848240", description: "Needle roller bearings", gstRate: 18 },
    "848250": { code: "848250", description: "Cylindrical roller bearings", gstRate: 18 },
    "848280": { code: "848280", description: "Other ball or roller bearings", gstRate: 18 },
    "848291": { code: "848291", description: "Balls, needles and rollers for bearings", gstRate: 18 },
    "848299": { code: "848299", description: "Other parts of bearings", gstRate: 18 },
    "848310": { code: "848310", description: "Transmission shafts and cranks", gstRate: 18 },
    "848320": { code: "848320", description: "Bearing housings", gstRate: 18 },
    "848330": { code: "848330", description: "Plain shaft bearings", gstRate: 18 },
    "848340": { code: "848340", description: "Gears and gearing; ball screws; gear boxes", gstRate: 18 },
    "848350": { code: "848350", description: "Flywheels and pulleys", gstRate: 18 },
    "848360": { code: "848360", description: "Clutches and shaft couplings", gstRate: 18 },
    "848410": { code: "848410", description: "Gaskets of metal sheeting combined with other material", gstRate: 18 },
    "848420": { code: "848420", description: "Mechanical seals", gstRate: 18 },

    // Electrical Equipment
    "850110": { code: "850110", description: "Electric motors of output not exceeding 37.5 W", gstRate: 18 },
    "850120": { code: "850120", description: "Universal AC/DC motors of output exceeding 37.5 W", gstRate: 18 },
    "850131": { code: "850131", description: "DC motors of output not exceeding 750 W", gstRate: 18 },
    "850132": { code: "850132", description: "DC motors of output 750 W to 75 kW", gstRate: 18 },
    "850140": { code: "850140", description: "AC motors, single-phase", gstRate: 18 },
    "850151": { code: "850151", description: "AC motors, multi-phase, output not exceeding 750 W", gstRate: 18 },
    "850152": { code: "850152", description: "AC motors, multi-phase, output 750 W to 75 kW", gstRate: 18 },
    "850410": { code: "850410", description: "Ballasts for discharge lamps or tubes", gstRate: 18 },
    "850421": { code: "850421", description: "Liquid dielectric transformers, power handling ≤650 kVA", gstRate: 18 },
    "850422": { code: "850422", description: "Liquid dielectric transformers, power 650 kVA to 10000 kVA", gstRate: 18 },
    "850431": { code: "850431", description: "Other transformers, power handling ≤1 kVA", gstRate: 18 },
    "850432": { code: "850432", description: "Other transformers, power 1 kVA to 16 kVA", gstRate: 18 },
    "850433": { code: "850433", description: "Other transformers, power 16 kVA to 500 kVA", gstRate: 18 },
    "850440": { code: "850440", description: "Static converters (rectifiers, inverters, UPS)", gstRate: 18 },
    "850450": { code: "850450", description: "Inductors", gstRate: 18 },
    "853610": { code: "853610", description: "Fuses for a voltage not exceeding 1,000 V", gstRate: 18 },
    "853620": { code: "853620", description: "Automatic circuit breakers for voltage ≤1,000 V", gstRate: 18 },
    "853630": { code: "853630", description: "Other apparatus for protecting electrical circuits", gstRate: 18 },
    "853641": { code: "853641", description: "Relays for a voltage not exceeding 60 V", gstRate: 18 },
    "853649": { code: "853649", description: "Other relays for voltage ≤1,000 V", gstRate: 18 },
    "853650": { code: "853650", description: "Switches for voltage ≤1,000 V", gstRate: 18 },
    "853661": { code: "853661", description: "Lamp-holders", gstRate: 18 },
    "853669": { code: "853669", description: "Plugs and sockets for voltage ≤1,000 V", gstRate: 18 },
    "853670": { code: "853670", description: "Connectors for optical fibres and cables", gstRate: 18 },
    "853690": { code: "853690", description: "Other apparatus for switching electrical circuits", gstRate: 18 },

    // Pumps and Valves
    "841311": { code: "841311", description: "Pumps for dispensing fuel at filling stations", gstRate: 18 },
    "841319": { code: "841319", description: "Other pumps fitted with measuring device", gstRate: 18 },
    "841320": { code: "841320", description: "Hand pumps", gstRate: 18 },
    "841330": { code: "841330", description: "Fuel, lubricating or cooling pumps for engines", gstRate: 18 },
    "841340": { code: "841340", description: "Concrete pumps", gstRate: 18 },
    "841350": { code: "841350", description: "Other reciprocating positive displacement pumps", gstRate: 18 },
    "841360": { code: "841360", description: "Other rotary positive displacement pumps", gstRate: 18 },
    "841370": { code: "841370", description: "Centrifugal pumps", gstRate: 18 },
    "841381": { code: "841381", description: "Other pumps", gstRate: 18 },
    "841391": { code: "841391", description: "Parts of pumps", gstRate: 18 },
    "841410": { code: "841410", description: "Vacuum pumps", gstRate: 18 },
    "841420": { code: "841420", description: "Hand or foot-operated air pumps", gstRate: 18 },
    "841430": { code: "841430", description: "Compressors for refrigerating equipment", gstRate: 18 },
    "841440": { code: "841440", description: "Air compressors mounted on wheeled chassis", gstRate: 18 },
    "848110": { code: "848110", description: "Pressure-reducing valves", gstRate: 18 },
    "848120": { code: "848120", description: "Valves for oleohydraulic or pneumatic transmissions", gstRate: 18 },
    "848130": { code: "848130", description: "Check valves", gstRate: 18 },
    "848140": { code: "848140", description: "Safety or relief valves", gstRate: 18 },
    "848180": { code: "848180", description: "Other taps, cocks, valves", gstRate: 18 },
    "848190": { code: "848190", description: "Parts of valves", gstRate: 18 },

    // Water Treatment
    "842121": { code: "842121", description: "Filtering or purifying machinery for water", gstRate: 18 },
    "842129": { code: "842129", description: "Filtering or purifying machinery for other liquids", gstRate: 18 },
    "842131": { code: "842131", description: "Intake air filters for internal combustion engines", gstRate: 18 },
    "842139": { code: "842139", description: "Filtering or purifying machinery for gases", gstRate: 18 },
    "842191": { code: "842191", description: "Parts of centrifuges", gstRate: 18 },
    "842199": { code: "842199", description: "Parts of filtering or purifying machinery", gstRate: 18 },

    // Vehicles and Parts
    "870321": { code: "870321", description: "Motor vehicles with spark-ignition engine ≤1000 cc", gstRate: 28 },
    "870322": { code: "870322", description: "Motor vehicles with spark-ignition engine 1000-1500 cc", gstRate: 28 },
    "870323": { code: "870323", description: "Motor vehicles with spark-ignition engine 1500-3000 cc", gstRate: 28 },
    "870324": { code: "870324", description: "Motor vehicles with spark-ignition engine >3000 cc", gstRate: 28 },
    "870331": { code: "870331", description: "Motor vehicles with diesel engine ≤1500 cc", gstRate: 28 },
    "870332": { code: "870332", description: "Motor vehicles with diesel engine 1500-2500 cc", gstRate: 28 },
    "870333": { code: "870333", description: "Motor vehicles with diesel engine >2500 cc", gstRate: 28 },
    "870340": { code: "870340", description: "Other vehicles with electric motor", gstRate: 5 },
    "870810": { code: "870810", description: "Bumpers and parts thereof for motor vehicles", gstRate: 28 },
    "870821": { code: "870821", description: "Safety seat belts for motor vehicles", gstRate: 28 },
    "870829": { code: "870829", description: "Other parts of bodies for motor vehicles", gstRate: 28 },
    "870830": { code: "870830", description: "Brakes and servo-brakes and parts for motor vehicles", gstRate: 28 },
    "870840": { code: "870840", description: "Gear boxes and parts for motor vehicles", gstRate: 28 },
    "870850": { code: "870850", description: "Drive-axles with differential for motor vehicles", gstRate: 28 },
    "870870": { code: "870870", description: "Road wheels and parts for motor vehicles", gstRate: 28 },
    "870880": { code: "870880", description: "Suspension shock-absorbers for motor vehicles", gstRate: 28 },
    "870891": { code: "870891", description: "Radiators and parts for motor vehicles", gstRate: 28 },
    "870892": { code: "870892", description: "Silencers and exhaust pipes for motor vehicles", gstRate: 28 },
    "870893": { code: "870893", description: "Clutches and parts for motor vehicles", gstRate: 28 },
    "870894": { code: "870894", description: "Steering wheels, columns and boxes for motor vehicles", gstRate: 28 },
    "870895": { code: "870895", description: "Safety airbags; parts for motor vehicles", gstRate: 28 },
    "870899": { code: "870899", description: "Other parts and accessories for motor vehicles", gstRate: 28 },
};

// Specific 8-digit tariff codes for very detailed lookups
const HSN_TARIFF: Record<string, HSNEntry> = {
    // Bearings - specific tariff items
    "84821010": { code: "84821010", description: "Ball bearings with greatest external diameter not exceeding 30 mm", gstRate: 18 },
    "84821090": { code: "84821090", description: "Other ball bearings", gstRate: 18 },
    "84822010": { code: "84822010", description: "Tapered roller bearings, including cone and tapered roller assemblies", gstRate: 18 },
    "84823000": { code: "84823000", description: "Spherical roller bearings", gstRate: 18 },
    "84824000": { code: "84824000", description: "Needle roller bearings", gstRate: 18 },
    "84829900": { code: "84829900", description: "Other parts of bearings", gstRate: 18 },

    // Transmission
    "84831010": { code: "84831010", description: "Crank shafts for automobiles", gstRate: 18 },
    "84831020": { code: "84831020", description: "Cam shafts for automobiles", gstRate: 18 },
    "84831090": { code: "84831090", description: "Other transmission shafts and cranks", gstRate: 18 },
    "84833000": { code: "84833000", description: "Bearing housings; plain shaft bearings", gstRate: 18 },
    "84834000": { code: "84834000", description: "Gears and gearing; ball screws; gear boxes; torque converters", gstRate: 18 },

    // Gaskets and Seals
    "84841000": { code: "84841000", description: "Gaskets of metal sheeting combined with other material", gstRate: 18 },
    "84842000": { code: "84842000", description: "Mechanical seals", gstRate: 18 },

    // Water Treatment specifics
    "84212100": { code: "84212100", description: "Filtering or purifying machinery for water", gstRate: 18 },
    "84212910": { code: "84212910", description: "Oil purifiers for internal combustion engines", gstRate: 18 },
    "84212990": { code: "84212990", description: "Other filtering or purifying machinery for liquids", gstRate: 18 },

    // Computers
    "84713010": { code: "84713010", description: "Personal computers (laptops, notebooks)", gstRate: 18 },
    "84713090": { code: "84713090", description: "Other portable digital automatic data processing machines", gstRate: 18 },
    "84714110": { code: "84714110", description: "Micro computers", gstRate: 18 },
    "84714190": { code: "84714190", description: "Other digital automatic data processing machines", gstRate: 18 },

    // Mobile Phones
    "85171210": { code: "85171210", description: "Push button type cellular phones", gstRate: 18 },
    "85171290": { code: "85171290", description: "Other telephones for cellular networks (smartphones)", gstRate: 18 },
};

/**
 * Combined HSN Master - Unified lookup across all code levels
 */
export const HSN_MASTER: Record<string, HSNEntry> = {
    // Include chapters (2-digit)
    ...Object.fromEntries(
        Object.entries(HSN_CHAPTERS).map(([k, v]) => [k, { code: v.code, description: v.description }])
    ),
    // Include all headings (4-digit)
    ...ALL_HSN_HEADINGS,
    // Include sub-headings (6-digit)
    ...HSN_SUBHEADINGS,
    // Include tariff items (8-digit)
    ...HSN_TARIFF,
    // Include SAC groups (4-digit)
    ...Object.fromEntries(
        Object.entries(SAC_GROUPS).map(([k, v]) => [k, { code: v.code, description: v.description, gstRate: v.gstRate }])
    ),
    // Include SAC services (6-digit)
    ...Object.fromEntries(
        Object.entries(SAC_SERVICES).map(([k, v]) => [k, { code: v.code, description: v.description, gstRate: v.gstRate }])
    ),
};

/**
 * Get hierarchical description for any HSN/SAC code
 * Builds a composite description from chapter → heading → subheading
 */
export function getHSNDescription(code: string | number | undefined): string {
    if (!code) return "Goods/Services";

    const codeStr = String(code).trim().replace(/[^0-9]/g, '');
    if (!codeStr) return "Goods/Services";

    // Check if it's a SAC code (starts with 99)
    if (codeStr.startsWith('99')) {
        return getSACDescription(codeStr);
    }

    // Try exact match first (8-digit → 6-digit → 4-digit → 2-digit)
    if (HSN_TARIFF[codeStr]) {
        return HSN_TARIFF[codeStr].description;
    }

    const sixDigit = codeStr.substring(0, 6);
    if (HSN_SUBHEADINGS[sixDigit]) {
        return HSN_SUBHEADINGS[sixDigit].description;
    }

    const fourDigit = codeStr.substring(0, 4);
    if (ALL_HSN_HEADINGS[fourDigit]) {
        return ALL_HSN_HEADINGS[fourDigit].description;
    }

    const twoDigit = codeStr.substring(0, 2).padStart(2, '0');
    if (HSN_CHAPTERS[twoDigit]) {
        return HSN_CHAPTERS[twoDigit].description;
    }

    // Fallback: Build composite description
    return buildCompositeDescription(codeStr);
}

/**
 * Get SAC description for service codes
 */
function getSACDescription(code: string): string {
    // Try 6-digit SAC first
    if (code.length >= 6 && SAC_SERVICES[code.substring(0, 6)]) {
        return SAC_SERVICES[code.substring(0, 6)].description;
    }

    // Try 4-digit SAC group
    const fourDigit = code.substring(0, 4);
    if (SAC_GROUPS[fourDigit]) {
        return SAC_GROUPS[fourDigit].description;
    }

    return "Services";
}

/**
 * Build composite description from hierarchy
 */
function buildCompositeDescription(code: string): string {
    const parts: string[] = [];

    // Get chapter
    const twoDigit = code.substring(0, 2).padStart(2, '0');
    const chapter = HSN_CHAPTERS[twoDigit];
    if (chapter) {
        parts.push(chapter.description);
    }

    // Get heading if available
    if (code.length >= 4) {
        const fourDigit = code.substring(0, 4);
        const heading = ALL_HSN_HEADINGS[fourDigit];
        if (heading) {
            parts.push(heading.description);
        }
    }

    // Get sub-heading if available
    if (code.length >= 6) {
        const sixDigit = code.substring(0, 6);
        const subheading = HSN_SUBHEADINGS[sixDigit];
        if (subheading) {
            parts.push(subheading.description);
        }
    }

    if (parts.length === 0) {
        return "Goods/Services";
    }

    // Return the most specific description available
    return parts[parts.length - 1];
}

/**
 * Get GST rate suggestion for HSN/SAC code
 * Cascades from most specific to least specific
 */
export function getHSNGSTRate(code: string | number | undefined): number | undefined {
    if (!code) return undefined;

    const codeStr = String(code).trim().replace(/[^0-9]/g, '');
    if (!codeStr) return undefined;

    // Check SAC codes
    if (codeStr.startsWith('99')) {
        if (codeStr.length >= 6 && SAC_SERVICES[codeStr.substring(0, 6)]?.gstRate !== undefined) {
            return SAC_SERVICES[codeStr.substring(0, 6)].gstRate;
        }
        const fourDigit = codeStr.substring(0, 4);
        if (SAC_GROUPS[fourDigit]?.gstRate !== undefined) {
            return SAC_GROUPS[fourDigit].gstRate;
        }
        return 18; // Default for services
    }

    // Check HSN codes (8 → 6 → 4 digits)
    if (HSN_TARIFF[codeStr]?.gstRate !== undefined) {
        return HSN_TARIFF[codeStr].gstRate;
    }

    const sixDigit = codeStr.substring(0, 6);
    if (HSN_SUBHEADINGS[sixDigit]?.gstRate !== undefined) {
        return HSN_SUBHEADINGS[sixDigit].gstRate;
    }

    const fourDigit = codeStr.substring(0, 4);
    if (ALL_HSN_HEADINGS[fourDigit]?.gstRate !== undefined) {
        return ALL_HSN_HEADINGS[fourDigit].gstRate;
    }

    return undefined;
}

/**
 * Get detailed breakdown of HSN code hierarchy
 */
export function getHSNHierarchy(code: string | number | undefined): {
    chapter?: { code: string; description: string; section: string };
    heading?: { code: string; description: string };
    subheading?: { code: string; description: string };
    tariff?: { code: string; description: string };
    gstRate?: number;
} {
    if (!code) return {};

    const codeStr = String(code).trim().replace(/[^0-9]/g, '');
    if (!codeStr) return {};

    const result: ReturnType<typeof getHSNHierarchy> = {};

    // Get chapter (2-digit)
    const twoDigit = codeStr.substring(0, 2).padStart(2, '0');
    const chapter = HSN_CHAPTERS[twoDigit];
    if (chapter) {
        result.chapter = {
            code: chapter.code,
            description: chapter.description,
            section: chapter.sectionName,
        };
    }

    // Get heading (4-digit)
    if (codeStr.length >= 4) {
        const fourDigit = codeStr.substring(0, 4);
        const heading = ALL_HSN_HEADINGS[fourDigit];
        if (heading) {
            result.heading = {
                code: heading.code,
                description: heading.description,
            };
        }
    }

    // Get sub-heading (6-digit)
    if (codeStr.length >= 6) {
        const sixDigit = codeStr.substring(0, 6);
        const subheading = HSN_SUBHEADINGS[sixDigit];
        if (subheading) {
            result.subheading = {
                code: subheading.code,
                description: subheading.description,
            };
        }
    }

    // Get tariff (8-digit)
    if (codeStr.length >= 8) {
        const tariff = HSN_TARIFF[codeStr];
        if (tariff) {
            result.tariff = {
                code: tariff.code,
                description: tariff.description,
            };
        }
    }

    // Get GST rate
    result.gstRate = getHSNGSTRate(codeStr);

    return result;
}

/**
 * Validate if an HSN/SAC code exists in the master
 */
export function isValidHSNCode(code: string | number | undefined): boolean {
    if (!code) return false;

    const codeStr = String(code).trim().replace(/[^0-9]/g, '');
    if (!codeStr || codeStr.length < 2) return false;

    // Check SAC codes
    if (codeStr.startsWith('99')) {
        if (codeStr.length >= 6 && SAC_SERVICES[codeStr.substring(0, 6)]) return true;
        if (codeStr.length >= 4 && SAC_GROUPS[codeStr.substring(0, 4)]) return true;
        return false;
    }

    // Check HSN codes
    const twoDigit = codeStr.substring(0, 2).padStart(2, '0');
    if (!HSN_CHAPTERS[twoDigit]) return false;

    // For 4+ digit codes, check if heading exists
    if (codeStr.length >= 4) {
        const fourDigit = codeStr.substring(0, 4);
        if (ALL_HSN_HEADINGS[fourDigit]) return true;
    }

    // 2-digit chapter codes are valid
    if (codeStr.length === 2) return true;

    // For 6+ digit codes where we don't have the exact heading, still allow if chapter exists
    return true;
}

/**
 * Search HSN codes by description keyword
 */
export function searchHSNByDescription(keyword: string, limit: number = 20): HSNEntry[] {
    const searchTerm = keyword.toLowerCase();
    const results: HSNEntry[] = [];

    // Search headings
    for (const [code, entry] of Object.entries(ALL_HSN_HEADINGS)) {
        if (entry.description.toLowerCase().includes(searchTerm)) {
            results.push({ code, description: entry.description, gstRate: entry.gstRate });
            if (results.length >= limit) break;
        }
    }

    // Search SAC services
    if (results.length < limit) {
        for (const [code, entry] of Object.entries(SAC_SERVICES)) {
            if (entry.description.toLowerCase().includes(searchTerm)) {
                results.push({ code, description: entry.description, gstRate: entry.gstRate });
                if (results.length >= limit) break;
            }
        }
    }

    return results;
}

// Re-export utility functions
export { getChapterInfo, getSACGroupInfo, getSACServiceInfo };
