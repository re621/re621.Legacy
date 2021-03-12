
// List of suggested tags, in no particular order
// The key is the proposed tag, corresponding object - conditions under which it applies
//
// Key can include several (mutually exclusive) tags, separated by a pipe character `|`.
//
// The object's parameters are as follows:
// * `has`: unless matchCount is specified, all of these tags must be present
// * `matchCount`: if specified, this number of tags from the `has` field must be present (any combination)
// * `not`: none of these tags must be present
//
// The tags can be listed as either strings or regular expressions.
// * String tags are better for performance, but must be matched **exactly**.
// * Regular expressions can be anything, but are slightly worse performance-wise
// This happens because 
// Tag lists can be single value or arrays. Mixed arrays are permitted.
export const TagSuggestionsList: SuggestionSet = {

    // Groups
    "multiple_images|multiple_scenes": { has: ["solo", "duo", "group"], matchCount: 2, not: ["multiple_images", "multiple_scenes"] },

    // Characters
    "faceless_human": { has: [/^faceless_/, "human"] },
    "faceless_anthro": { has: [/^faceless_/, "anthro"] },
    "faceless_feral": { has: [/^faceless_/, "feral"] },

    // Situation
    "rear_view": { has: "looking_back" },
    "solo_focus": { has: [/^faceless_/, /^(duo|group)$/] },

    // Penetration
    "male_penetrating": { has: /^male_penetrating_.+$/ },
    "female_penetrating": { has: /^female_penetrating_.+$/ },
    "andromorph_penetrating": { has: /^andromorph_penetrating_.+$/ },
    "gynomorph_penetrating": { has: /^gynomorph_penetrating_.+$/ },
    "herm_penetrating": { has: /^herm_penetrating_.+$/ },
    "maleherm_penetrating": { has: /^maleherm_penetrating_.+$/ },

    "male_penetrated": { has: /^.+_penetrating_male$/ },
    "female_penetrated": { has: /^.+_penetrating_female$/ },
    "andromorph_penetrated": { has: /^.+_penetrating_andromorph$/ },
    "gynomorph_penetrated": { has: /^.+_penetrating_gynomorph$/ },
    "herm_penetrated": { has: /^.+_penetrating_herm$/ },
    "maleherm_penetrated": { has: /^.+_penetrating_maleherm$/ },

    // Activities
    "sex": { has: /^(.+_penetrating_.+|.+_penetration|.+_position|cunnilingus|fellatio|rimming)$/ },
    "rape": { has: [/^forced/, /rating:q|rating:e/] },
    "pregnant_sex": { has: ["pregnant", "sex"] },
    "penile_masturbation": { has: ["penis", "masturbation"] },
    "vaginal_masturbation": { has: ["pussy", "masturbation"] },
    "speech_bubble|thought_bubble": { has: "dialogue", },

    // Anatomy
    "butt": { has: "presenting_hindquarters" },
    "non-mammal_breasts": { has: ["breasts", /^(reptile|lizard|marine|avian|arthropod|flora_fauna|insect)$/] },
    "nipples": { has: /^(breasts|teats)$/, not: ["featureless_breasts", "clothed"] },
    "areola": { has: "nipples" },
    "penis": { has: /(handjob|fellatio|penile|knot|medial_ring|penis)/ },
    "pussy": { has: /vaginal/ },
    "erection|flaccid|half-erect": { has: /penis|penile/, not: ["erection", "flaccid", "half-erect"] },

    "canine_penis": { has: "knot" },
    "knot": { has: "canine_penis" },
    "sheath": { has: "canine_penis" },

    "equine_penis": { has: "medial_ring", },
    "knotted_equine_penis": { has: ["medial_ring", "knot"] },
    "medial_ring": { has: "equine_penis" },
    "flared_penis": { has: "equine_penis" },

    "hooves": { has: /^(underhoof|fetlocks)$/ },
    "paws": { has: "claws" },

    "muscular_anthro": { has: [/^muscular/, "anthro"] },
    "muscular_feral": { has: [/^muscular/, "feral"] },
    "muscular_humanoid": { has: [/^muscular/, "humanoid"] },
    "muscular_human": { has: [/^muscular/, "human"] },
    "muscular_taur": { has: [/^muscular/, "taur"] },

    "muscular_male": { has: [/^muscular/, "male"] },
    "muscular_female": { has: [/^muscular/, "female"] },
    "muscular_andromorph": { has: [/^muscular/, "andromorph"] },
    "muscular_gynomorph": { has: [/^muscular/, "gynomorph"] },
    "muscular_herm": { has: [/^muscular/, "herm"] },
    "muscular_maleherm": { has: [/^muscular/, "maleherm"] },

    "overweight_anthro": { has: [/^overweight/, "anthro"] },
    "overweight_feral": { has: [/^overweight/, "feral"] },
    "overweight_humanoid": { has: [/^overweight/, "humanoid"] },
    "overweight_human": { has: [/^overweight/, "human"] },
    "overweight_taur": { has: [/^overweight/, "taur"] },

    "overweight_male": { has: [/^overweight/, "male"] },
    "overweight_female": { has: [/^overweight/, "female"] },
    "overweight_andromorph": { has: [/^overweight/, "andromorph"] },
    "overweight_gynomorph": { has: [/^overweight/, "gynomorph"] },
    "overweight_herm": { has: [/^overweight/, "herm"] },
    "overweight_maleherm": { has: [/^overweight/, "maleherm"] },

    "countershade_fur": { has: [/^countershad(e|ing)/, /fur/] },
    "countershade_scales": { has: [/^countershad(e|ing)/, /scales/] },

    // Body Parts
    "biped": { has: "anthro", not: /^(uniped|triped)$/ },
    "quadruped": { has: "feral", not: /^(hexapod|semi-anthro)$/ },
    "legless": { has: /^(naga|lamia|merfolk)$/ },

}

type SuggestionSet = {
    [tag: string]: TagSuggestion;
};

export type TagSuggestion = {
    has?: SuggestionParam;
    not?: SuggestionParam;
    matchCount?: number;
}

type SuggestionParam = RegExp | string | (RegExp | string)[];
