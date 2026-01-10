/**
 * HSN Chapters (2-digit codes) - Complete list of all 99 chapters
 * 
 * HSN Structure:
 * - Chapters are organized into 21 Sections
 * - Each chapter covers a specific category of goods
 * 
 * Reference: https://cbic-gst.gov.in/gst-goods-services-rates.html
 */

export interface HSNChapter {
    code: string;
    description: string;
    section: number;
    sectionName: string;
}

// Complete list of all 99 HSN Chapters organized by Sections
export const HSN_CHAPTERS: Record<string, HSNChapter> = {
    // Section I: Live Animals; Animal Products (Chapters 1-5)
    "01": { code: "01", description: "Live animals", section: 1, sectionName: "Live Animals; Animal Products" },
    "02": { code: "02", description: "Meat and edible meat offal", section: 1, sectionName: "Live Animals; Animal Products" },
    "03": { code: "03", description: "Fish and crustaceans, molluscs and other aquatic invertebrates", section: 1, sectionName: "Live Animals; Animal Products" },
    "04": { code: "04", description: "Dairy produce; birds' eggs; natural honey; edible products of animal origin", section: 1, sectionName: "Live Animals; Animal Products" },
    "05": { code: "05", description: "Products of animal origin, not elsewhere specified or included", section: 1, sectionName: "Live Animals; Animal Products" },

    // Section II: Vegetable Products (Chapters 6-14)
    "06": { code: "06", description: "Live trees and other plants; bulbs, roots and the like; cut flowers", section: 2, sectionName: "Vegetable Products" },
    "07": { code: "07", description: "Edible vegetables and certain roots and tubers", section: 2, sectionName: "Vegetable Products" },
    "08": { code: "08", description: "Edible fruit and nuts; peel of citrus fruit or melons", section: 2, sectionName: "Vegetable Products" },
    "09": { code: "09", description: "Coffee, tea, mate and spices", section: 2, sectionName: "Vegetable Products" },
    "10": { code: "10", description: "Cereals", section: 2, sectionName: "Vegetable Products" },
    "11": { code: "11", description: "Products of the milling industry; malt; starches; inulin; wheat gluten", section: 2, sectionName: "Vegetable Products" },
    "12": { code: "12", description: "Oil seeds and oleaginous fruits; miscellaneous grains, seeds and fruit", section: 2, sectionName: "Vegetable Products" },
    "13": { code: "13", description: "Lac; gums, resins and other vegetable saps and extracts", section: 2, sectionName: "Vegetable Products" },
    "14": { code: "14", description: "Vegetable plaiting materials; vegetable products not elsewhere specified", section: 2, sectionName: "Vegetable Products" },

    // Section III: Animal or Vegetable Fats and Oils (Chapter 15)
    "15": { code: "15", description: "Animal or vegetable fats and oils and their cleavage products", section: 3, sectionName: "Animal or Vegetable Fats and Oils" },

    // Section IV: Prepared Foodstuffs; Beverages, Spirits; Tobacco (Chapters 16-24)
    "16": { code: "16", description: "Preparations of meat, of fish or of crustaceans, molluscs", section: 4, sectionName: "Prepared Foodstuffs; Beverages, Spirits; Tobacco" },
    "17": { code: "17", description: "Sugars and sugar confectionery", section: 4, sectionName: "Prepared Foodstuffs; Beverages, Spirits; Tobacco" },
    "18": { code: "18", description: "Cocoa and cocoa preparations", section: 4, sectionName: "Prepared Foodstuffs; Beverages, Spirits; Tobacco" },
    "19": { code: "19", description: "Preparations of cereals, flour, starch or milk; pastrycooks' products", section: 4, sectionName: "Prepared Foodstuffs; Beverages, Spirits; Tobacco" },
    "20": { code: "20", description: "Preparations of vegetables, fruit, nuts or other parts of plants", section: 4, sectionName: "Prepared Foodstuffs; Beverages, Spirits; Tobacco" },
    "21": { code: "21", description: "Miscellaneous edible preparations", section: 4, sectionName: "Prepared Foodstuffs; Beverages, Spirits; Tobacco" },
    "22": { code: "22", description: "Beverages, spirits and vinegar", section: 4, sectionName: "Prepared Foodstuffs; Beverages, Spirits; Tobacco" },
    "23": { code: "23", description: "Residues and waste from the food industries; prepared animal fodder", section: 4, sectionName: "Prepared Foodstuffs; Beverages, Spirits; Tobacco" },
    "24": { code: "24", description: "Tobacco and manufactured tobacco substitutes", section: 4, sectionName: "Prepared Foodstuffs; Beverages, Spirits; Tobacco" },

    // Section V: Mineral Products (Chapters 25-27)
    "25": { code: "25", description: "Salt; sulphur; earths and stone; plastering materials, lime and cement", section: 5, sectionName: "Mineral Products" },
    "26": { code: "26", description: "Ores, slag and ash", section: 5, sectionName: "Mineral Products" },
    "27": { code: "27", description: "Mineral fuels, mineral oils and products of their distillation", section: 5, sectionName: "Mineral Products" },

    // Section VI: Products of Chemical Industries (Chapters 28-38)
    "28": { code: "28", description: "Inorganic chemicals; organic or inorganic compounds of precious metals", section: 6, sectionName: "Products of Chemical Industries" },
    "29": { code: "29", description: "Organic chemicals", section: 6, sectionName: "Products of Chemical Industries" },
    "30": { code: "30", description: "Pharmaceutical products", section: 6, sectionName: "Products of Chemical Industries" },
    "31": { code: "31", description: "Fertilisers", section: 6, sectionName: "Products of Chemical Industries" },
    "32": { code: "32", description: "Tanning or dyeing extracts; tannins; dyes, pigments; paints and varnishes", section: 6, sectionName: "Products of Chemical Industries" },
    "33": { code: "33", description: "Essential oils and resinoids; perfumery, cosmetic or toilet preparations", section: 6, sectionName: "Products of Chemical Industries" },
    "34": { code: "34", description: "Soap, organic surface-active agents; washing preparations; lubricating preparations", section: 6, sectionName: "Products of Chemical Industries" },
    "35": { code: "35", description: "Albuminoidal substances; modified starches; glues; enzymes", section: 6, sectionName: "Products of Chemical Industries" },
    "36": { code: "36", description: "Explosives; pyrotechnic products; matches; pyrophoric alloys", section: 6, sectionName: "Products of Chemical Industries" },
    "37": { code: "37", description: "Photographic or cinematographic goods", section: 6, sectionName: "Products of Chemical Industries" },
    "38": { code: "38", description: "Miscellaneous chemical products", section: 6, sectionName: "Products of Chemical Industries" },

    // Section VII: Plastics and Articles thereof; Rubber (Chapters 39-40)
    "39": { code: "39", description: "Plastics and articles thereof", section: 7, sectionName: "Plastics and Articles thereof; Rubber" },
    "40": { code: "40", description: "Rubber and articles thereof", section: 7, sectionName: "Plastics and Articles thereof; Rubber" },

    // Section VIII: Raw Hides, Skins, Leather (Chapters 41-43)
    "41": { code: "41", description: "Raw hides and skins (other than furskins) and leather", section: 8, sectionName: "Raw Hides, Skins, Leather" },
    "42": { code: "42", description: "Articles of leather; saddlery and harness; travel goods, handbags", section: 8, sectionName: "Raw Hides, Skins, Leather" },
    "43": { code: "43", description: "Furskins and artificial fur; manufactures thereof", section: 8, sectionName: "Raw Hides, Skins, Leather" },

    // Section IX: Wood and Articles of Wood (Chapters 44-46)
    "44": { code: "44", description: "Wood and articles of wood; wood charcoal", section: 9, sectionName: "Wood and Articles of Wood" },
    "45": { code: "45", description: "Cork and articles of cork", section: 9, sectionName: "Wood and Articles of Wood" },
    "46": { code: "46", description: "Manufactures of straw, of esparto or of other plaiting materials", section: 9, sectionName: "Wood and Articles of Wood" },

    // Section X: Pulp of Wood; Paper and Paperboard (Chapters 47-49)
    "47": { code: "47", description: "Pulp of wood or of other fibrous cellulosic material", section: 10, sectionName: "Pulp of Wood; Paper and Paperboard" },
    "48": { code: "48", description: "Paper and paperboard; articles of paper pulp, of paper or of paperboard", section: 10, sectionName: "Pulp of Wood; Paper and Paperboard" },
    "49": { code: "49", description: "Printed books, newspapers, pictures and other products of printing", section: 10, sectionName: "Pulp of Wood; Paper and Paperboard" },

    // Section XI: Textiles and Textile Articles (Chapters 50-63)
    "50": { code: "50", description: "Silk", section: 11, sectionName: "Textiles and Textile Articles" },
    "51": { code: "51", description: "Wool, fine or coarse animal hair; horsehair yarn and woven fabric", section: 11, sectionName: "Textiles and Textile Articles" },
    "52": { code: "52", description: "Cotton", section: 11, sectionName: "Textiles and Textile Articles" },
    "53": { code: "53", description: "Other vegetable textile fibres; paper yarn and woven fabrics", section: 11, sectionName: "Textiles and Textile Articles" },
    "54": { code: "54", description: "Man-made filaments; strip of man-made textile materials", section: 11, sectionName: "Textiles and Textile Articles" },
    "55": { code: "55", description: "Man-made staple fibres", section: 11, sectionName: "Textiles and Textile Articles" },
    "56": { code: "56", description: "Wadding, felt and nonwovens; special yarns; twine, cordage, ropes", section: 11, sectionName: "Textiles and Textile Articles" },
    "57": { code: "57", description: "Carpets and other textile floor coverings", section: 11, sectionName: "Textiles and Textile Articles" },
    "58": { code: "58", description: "Special woven fabrics; tufted textile fabrics; lace; tapestries", section: 11, sectionName: "Textiles and Textile Articles" },
    "59": { code: "59", description: "Impregnated, coated, covered or laminated textile fabrics", section: 11, sectionName: "Textiles and Textile Articles" },
    "60": { code: "60", description: "Knitted or crocheted fabrics", section: 11, sectionName: "Textiles and Textile Articles" },
    "61": { code: "61", description: "Articles of apparel and clothing accessories, knitted or crocheted", section: 11, sectionName: "Textiles and Textile Articles" },
    "62": { code: "62", description: "Articles of apparel and clothing accessories, not knitted or crocheted", section: 11, sectionName: "Textiles and Textile Articles" },
    "63": { code: "63", description: "Other made up textile articles; sets; worn clothing and worn textile articles", section: 11, sectionName: "Textiles and Textile Articles" },

    // Section XII: Footwear, Headgear, Umbrellas (Chapters 64-67)
    "64": { code: "64", description: "Footwear, gaiters and the like; parts of such articles", section: 12, sectionName: "Footwear, Headgear, Umbrellas" },
    "65": { code: "65", description: "Headgear and parts thereof", section: 12, sectionName: "Footwear, Headgear, Umbrellas" },
    "66": { code: "66", description: "Umbrellas, sun umbrellas, walking-sticks, seat-sticks, whips", section: 12, sectionName: "Footwear, Headgear, Umbrellas" },
    "67": { code: "67", description: "Prepared feathers and down; artificial flowers; articles of human hair", section: 12, sectionName: "Footwear, Headgear, Umbrellas" },

    // Section XIII: Articles of Stone, Plaster, Cement, Ceramics, Glass (Chapters 68-70)
    "68": { code: "68", description: "Articles of stone, plaster, cement, asbestos, mica or similar materials", section: 13, sectionName: "Articles of Stone, Plaster, Cement, Ceramics, Glass" },
    "69": { code: "69", description: "Ceramic products", section: 13, sectionName: "Articles of Stone, Plaster, Cement, Ceramics, Glass" },
    "70": { code: "70", description: "Glass and glassware", section: 13, sectionName: "Articles of Stone, Plaster, Cement, Ceramics, Glass" },

    // Section XIV: Natural or Cultured Pearls, Precious Stones (Chapter 71)
    "71": { code: "71", description: "Natural or cultured pearls, precious or semi-precious stones, precious metals", section: 14, sectionName: "Natural or Cultured Pearls, Precious Stones" },

    // Section XV: Base Metals and Articles of Base Metal (Chapters 72-83)
    "72": { code: "72", description: "Iron and steel", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "73": { code: "73", description: "Articles of iron or steel", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "74": { code: "74", description: "Copper and articles thereof", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "75": { code: "75", description: "Nickel and articles thereof", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "76": { code: "76", description: "Aluminium and articles thereof", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "77": { code: "77", description: "Reserved for possible future use", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "78": { code: "78", description: "Lead and articles thereof", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "79": { code: "79", description: "Zinc and articles thereof", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "80": { code: "80", description: "Tin and articles thereof", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "81": { code: "81", description: "Other base metals; cermets; articles thereof", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "82": { code: "82", description: "Tools, implements, cutlery, spoons and forks, of base metal", section: 15, sectionName: "Base Metals and Articles of Base Metal" },
    "83": { code: "83", description: "Miscellaneous articles of base metal", section: 15, sectionName: "Base Metals and Articles of Base Metal" },

    // Section XVI: Machinery and Mechanical Appliances; Electrical Equipment (Chapters 84-85)
    "84": { code: "84", description: "Nuclear reactors, boilers, machinery and mechanical appliances", section: 16, sectionName: "Machinery and Mechanical Appliances; Electrical Equipment" },
    "85": { code: "85", description: "Electrical machinery and equipment and parts thereof", section: 16, sectionName: "Machinery and Mechanical Appliances; Electrical Equipment" },

    // Section XVII: Vehicles, Aircraft, Vessels (Chapters 86-89)
    "86": { code: "86", description: "Railway or tramway locomotives, rolling-stock and parts thereof", section: 17, sectionName: "Vehicles, Aircraft, Vessels" },
    "87": { code: "87", description: "Vehicles other than railway or tramway rolling-stock, and parts", section: 17, sectionName: "Vehicles, Aircraft, Vessels" },
    "88": { code: "88", description: "Aircraft, spacecraft, and parts thereof", section: 17, sectionName: "Vehicles, Aircraft, Vessels" },
    "89": { code: "89", description: "Ships, boats and floating structures", section: 17, sectionName: "Vehicles, Aircraft, Vessels" },

    // Section XVIII: Optical, Photographic, Medical Instruments (Chapters 90-92)
    "90": { code: "90", description: "Optical, photographic, cinematographic, measuring, checking instruments", section: 18, sectionName: "Optical, Photographic, Medical Instruments" },
    "91": { code: "91", description: "Clocks and watches and parts thereof", section: 18, sectionName: "Optical, Photographic, Medical Instruments" },
    "92": { code: "92", description: "Musical instruments; parts and accessories of such articles", section: 18, sectionName: "Optical, Photographic, Medical Instruments" },

    // Section XIX: Arms and Ammunition (Chapter 93)
    "93": { code: "93", description: "Arms and ammunition; parts and accessories thereof", section: 19, sectionName: "Arms and Ammunition" },

    // Section XX: Miscellaneous Manufactured Articles (Chapters 94-96)
    "94": { code: "94", description: "Furniture; bedding, mattresses; lamps and lighting fittings", section: 20, sectionName: "Miscellaneous Manufactured Articles" },
    "95": { code: "95", description: "Toys, games and sports requisites; parts and accessories thereof", section: 20, sectionName: "Miscellaneous Manufactured Articles" },
    "96": { code: "96", description: "Miscellaneous manufactured articles", section: 20, sectionName: "Miscellaneous Manufactured Articles" },

    // Section XXI: Works of Art, Collectors' Pieces and Antiques (Chapter 97)
    "97": { code: "97", description: "Works of art, collectors' pieces and antiques", section: 21, sectionName: "Works of Art, Collectors' Pieces and Antiques" },

    // Chapter 98-99 are special chapters for India
    "98": { code: "98", description: "Project imports; laboratory chemicals", section: 21, sectionName: "Special Classifications" },
    "99": { code: "99", description: "Services (SAC codes)", section: 21, sectionName: "Services" },
};

/**
 * Get chapter information by code
 */
export function getChapterInfo(code: string): HSNChapter | undefined {
    const chapterCode = code.substring(0, 2).padStart(2, '0');
    return HSN_CHAPTERS[chapterCode];
}

/**
 * Get all chapters in a section
 */
export function getChaptersBySection(sectionNumber: number): HSNChapter[] {
    return Object.values(HSN_CHAPTERS).filter(ch => ch.section === sectionNumber);
}
