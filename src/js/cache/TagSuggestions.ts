
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

    // Anatomy
    "butt": { has: "presenting_hindquarters" },
    "non-mammal_breasts": { has: ["breasts", /^(reptile|lizard|marine|avian|arthropod|flora_fauna|insect)$/] },
    "nipples": { has: /^(breasts|teats)$/, not: ["featureless_breasts", "clothed"] },
    "areola": { has: "nipples" },
    "penis": { has: /(handjob|fellatio|penile|knot|medial_ring|penis)/ },
    "pussy": { has: /vaginal/ },
    "erection|flaccid|half-erect": { has: /penis|penile/, not: ["erection", "flaccid", "half-erect"] },

    "canine_penis": { has: "knot" },
    "sheath": { has: "canine_penis" },

    "equine_penis": { has: "medial_ring", },
    "knotted_equine_penis": { has: ["medial_ring", "knot"] },
    "medial_ring": { has: "equine_penis" },
    "flared_penis": { has: "equine_penis" },

    "hooves": { has: /^(underhoof|fetlocks)$/ },
    "paws": { has: "claws" },

    "countershade_fur": { has: [/^countershad(e|ing)/, /fur/] },
    "countershade_scales": { has: [/^countershad(e|ing)/, /scales/] },

    // Body Parts
    "biped": { has: "anthro", not: /^(uniped|triped)$/ },
    "quadruped": { has: "feral", not: /^(hexapod|semi-anthro)$/ },
    "legless": { has: /^(naga|lamia|merfolk)$/ },

    // Faceless
    "faceless_anthro": { has: [/^faceless_/, "anthro"] },
    "faceless_human": { has: [/^faceless_/, "human"] },
    "faceless_humanoid": { has: [/^faceless_/, "humanoid"] },
    "faceless_feral": { has: [/^faceless_/, "feral"] },
    "faceless_taur": { has: [/^faceless_/, "taur"] },

    "faceless_male": { has: [/^faceless_/, "male"] },
    "faceless_female": { has: [/^faceless_/, "female"] },
    "faceless_ambiguous": { has: [/^faceless_/, "ambiguous_gender"] },
    "faceless_gynomorph": { has: [/^faceless_/, "gynomorph"] },
    "faceless_andromorph": { has: [/^faceless_/, "andromorph"] },
    "faceless_herm": { has: [/^faceless_/, "herm"] },
    "faceless_maleherm": { has: [/^faceless_/, "maleherm"] },

    // Smaller
    "smaller_anthro": { has: [/^smaller_/, "anthro"] },
    "smaller_human": { has: [/^smaller_/, "human"] },
    "smaller_humanoid": { has: [/^smaller_/, "humanoid"] },
    "smaller_feral": { has: [/^smaller_/, "feral"] },
    "smaller_taur": { has: [/^smaller_/, "taur"] },

    "smaller_male": { has: [/^smaller_/, "male"] },
    "smaller_female": { has: [/^smaller_/, "female"] },
    "smaller_ambiguous": { has: [/^smaller_/, "ambiguous_gender"] },
    "smaller_gynomorph": { has: [/^smaller_/, "gynomorph"] },
    "smaller_andromorph": { has: [/^smaller_/, "andromorph"] },
    "smaller_herm": { has: [/^smaller_/, "herm"] },
    "smaller_maleherm": { has: [/^smaller_/, "maleherm"] },

    // Larger
    "larger_anthro": { has: [/^larger_/, "anthro"] },
    "larger_human": { has: [/^larger_/, "human"] },
    "larger_humanoid": { has: [/^larger_/, "humanoid"] },
    "larger_feral": { has: [/^larger_/, "feral"] },
    "larger_taur": { has: [/^larger_/, "taur"] },

    "larger_male": { has: [/^larger_/, "male"] },
    "larger_female": { has: [/^larger_/, "female"] },
    "larger_ambiguous": { has: [/^larger_/, "ambiguous_gender"] },
    "larger_gynomorph": { has: [/^larger_/, "gynomorph"] },
    "larger_andromorph": { has: [/^larger_/, "andromorph"] },
    "larger_herm": { has: [/^larger_/, "herm"] },
    "larger_maleherm": { has: [/^larger_/, "maleherm"] },

    // Mature
    "mature_anthro": { has: [/^mature_/, "anthro"] },
    "mature_human": { has: [/^mature_/, "human"] },
    "mature_humanoid": { has: [/^mature_/, "humanoid"] },
    "mature_feral": { has: [/^mature_/, "feral"] },
    "mature_taur": { has: [/^mature_/, "taur"] },

    "mature_male": { has: [/^mature_/, "male"] },
    "mature_female": { has: [/^mature_/, "female"] },
    "mature_ambiguous": { has: [/^mature_/, "ambiguous_gender"] },
    "mature_gynomorph": { has: [/^mature_/, "gynomorph"] },
    "mature_andromorph": { has: [/^mature_/, "andromorph"] },
    "mature_herm": { has: [/^mature_/, "herm"] },
    "mature_maleherm": { has: [/^mature_/, "maleherm"] },

    // Muscular
    "muscular_anthro": { has: [/^muscular_/, "anthro"] },
    "muscular_human": { has: [/^muscular_/, "human"] },
    "muscular_humanoid": { has: [/^muscular_/, "humanoid"] },
    "muscular_feral": { has: [/^muscular_/, "feral"] },
    "muscular_taur": { has: [/^muscular_/, "taur"] },

    "muscular_male": { has: [/^muscular_/, "male"] },
    "muscular_female": { has: [/^muscular_/, "female"] },
    "muscular_ambiguous": { has: [/^muscular_/, "ambiguous_gender"] },
    "muscular_gynomorph": { has: [/^muscular_/, "gynomorph"] },
    "muscular_andromorph": { has: [/^muscular_/, "andromorph"] },
    "muscular_herm": { has: [/^muscular_/, "herm"] },
    "muscular_maleherm": { has: [/^muscular_/, "maleherm"] },

    // Elderly
    "elderly_anthro": { has: [/^elderly_/, "anthro"] },
    "elderly_human": { has: [/^elderly_/, "human"] },
    "elderly_humanoid": { has: [/^elderly_/, "humanoid"] },
    "elderly_feral": { has: [/^elderly_/, "feral"] },
    "elderly_taur": { has: [/^elderly_/, "taur"] },

    "elderly_male": { has: [/^elderly_/, "male"] },
    "elderly_female": { has: [/^elderly_/, "female"] },
    "elderly_ambiguous": { has: [/^elderly_/, "ambiguous_gender"] },
    "elderly_gynomorph": { has: [/^elderly_/, "gynomorph"] },
    "elderly_andromorph": { has: [/^elderly_/, "andromorph"] },
    "elderly_herm": { has: [/^elderly_/, "herm"] },
    "elderly_maleherm": { has: [/^elderly_/, "maleherm"] },

    // Older
    "older_anthro": { has: [/^older_/, "anthro"] },
    "older_human": { has: [/^older_/, "human"] },
    "older_humanoid": { has: [/^older_/, "humanoid"] },
    "older_feral": { has: [/^older_/, "feral"] },
    "older_taur": { has: [/^older_/, "taur"] },

    "older_male": { has: [/^older_/, "male"] },
    "older_female": { has: [/^older_/, "female"] },
    "older_ambiguous": { has: [/^older_/, "ambiguous_gender"] },
    "older_gynomorph": { has: [/^older_/, "gynomorph"] },
    "older_andromorph": { has: [/^older_/, "andromorph"] },
    "older_herm": { has: [/^older_/, "herm"] },
    "older_maleherm": { has: [/^older_/, "maleherm"] },

    // Younger
    "younger_anthro": { has: [/^younger_/, "anthro"] },
    "younger_human": { has: [/^younger_/, "human"] },
    "younger_humanoid": { has: [/^younger_/, "humanoid"] },
    "younger_feral": { has: [/^younger_/, "feral"] },
    "younger_taur": { has: [/^younger_/, "taur"] },

    "younger_male": { has: [/^younger_/, "male"] },
    "younger_female": { has: [/^younger_/, "female"] },
    "younger_ambiguous": { has: [/^younger_/, "ambiguous_gender"] },
    "younger_gynomorph": { has: [/^younger_/, "gynomorph"] },
    "younger_andromorph": { has: [/^younger_/, "andromorph"] },
    "younger_herm": { has: [/^younger_/, "herm"] },
    "younger_maleherm": { has: [/^younger_/, "maleherm"] },

    // Chubby
    "chubby_anthro": { has: [/^chubby_/, "anthro"] },
    "chubby_human": { has: [/^chubby_/, "human"] },
    "chubby_humanoid": { has: [/^chubby_/, "humanoid"] },
    "chubby_feral": { has: [/^chubby_/, "feral"] },
    "chubby_taur": { has: [/^chubby_/, "taur"] },

    "chubby_male": { has: [/^chubby_/, "male"] },
    "chubby_female": { has: [/^chubby_/, "female"] },
    "chubby_ambiguous": { has: [/^chubby_/, "ambiguous_gender"] },
    "chubby_gynomorph": { has: [/^chubby_/, "gynomorph"] },
    "chubby_andromorph": { has: [/^chubby_/, "andromorph"] },
    "chubby_herm": { has: [/^chubby_/, "herm"] },
    "chubby_maleherm": { has: [/^chubby_/, "maleherm"] },

    // Overweight
    "overweight_anthro": { has: [/^overweight_/, "anthro"] },
    "overweight_human": { has: [/^overweight_/, "human"] },
    "overweight_humanoid": { has: [/^overweight_/, "humanoid"] },
    "overweight_feral": { has: [/^overweight_/, "feral"] },
    "overweight_taur": { has: [/^overweight_/, "taur"] },

    "overweight_male": { has: [/^overweight_/, "male"] },
    "overweight_female": { has: [/^overweight_/, "female"] },
    "overweight_ambiguous": { has: [/^overweight_/, "ambiguous_gender"] },
    "overweight_gynomorph": { has: [/^overweight_/, "gynomorph"] },
    "overweight_andromorph": { has: [/^overweight_/, "andromorph"] },
    "overweight_herm": { has: [/^overweight_/, "herm"] },
    "overweight_maleherm": { has: [/^overweight_/, "maleherm"] },

    // Obese
    "obese_anthro": { has: [/^obese_/, "anthro"] },
    "obese_human": { has: [/^obese_/, "human"] },
    "obese_humanoid": { has: [/^obese_/, "humanoid"] },
    "obese_feral": { has: [/^obese_/, "feral"] },
    "obese_taur": { has: [/^obese_/, "taur"] },

    "obese_male": { has: [/^obese_/, "male"] },
    "obese_female": { has: [/^obese_/, "female"] },
    "obese_ambiguous": { has: [/^obese_/, "ambiguous_gender"] },
    "obese_gynomorph": { has: [/^obese_/, "gynomorph"] },
    "obese_andromorph": { has: [/^obese_/, "andromorph"] },
    "obese_herm": { has: [/^obese_/, "herm"] },
    "obese_maleherm": { has: [/^obese_/, "maleherm"] },

    // Morbidly Obese
    "morbidly_obese_anthro": { has: [/^morbidly_obese_/, "anthro"] },
    "morbidly_obese_human": { has: [/^morbidly_obese_/, "human"] },
    "morbidly_obese_humanoid": { has: [/^morbidly_obese_/, "humanoid"] },
    "morbidly_obese_feral": { has: [/^morbidly_obese_/, "feral"] },
    "morbidly_obese_taur": { has: [/^morbidly_obese_/, "taur"] },

    "morbidly_obese_male": { has: [/^morbidly_obese_/, "male"] },
    "morbidly_obese_female": { has: [/^morbidly_obese_/, "female"] },
    "morbidly_obese_ambiguous": { has: [/^morbidly_obese_/, "ambiguous_gender"] },
    "morbidly_obese_gynomorph": { has: [/^morbidly_obese_/, "gynomorph"] },
    "morbidly_obese_andromorph": { has: [/^morbidly_obese_/, "andromorph"] },
    "morbidly_obese_herm": { has: [/^morbidly_obese_/, "herm"] },
    "morbidly_obese_maleherm": { has: [/^morbidly_obese_/, "maleherm"] },

    // Athletic
    "athletic_anthro": { has: [/^athletic_/, "anthro"] },
    "athletic_human": { has: [/^athletic_/, "human"] },
    "athletic_humanoid": { has: [/^athletic_/, "humanoid"] },
    "athletic_feral": { has: [/^athletic_/, "feral"] },
    "athletic_taur": { has: [/^athletic_/, "taur"] },

    "athletic_male": { has: [/^athletic_/, "male"] },
    "athletic_female": { has: [/^athletic_/, "female"] },
    "athletic_ambiguous": { has: [/^athletic_/, "ambiguous_gender"] },
    "athletic_gynomorph": { has: [/^athletic_/, "gynomorph"] },
    "athletic_andromorph": { has: [/^athletic_/, "andromorph"] },
    "athletic_herm": { has: [/^athletic_/, "herm"] },
    "athletic_maleherm": { has: [/^athletic_/, "maleherm"] },

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
    "ambiguous_penetrating": { has: /^ambiguous_penetrating_.+$/ },

    "male_penetrated": { has: /^.+_penetrating_male$/ },
    "female_penetrated": { has: /^.+_penetrating_female$/ },
    "andromorph_penetrated": { has: /^.+_penetrating_andromorph$/ },
    "gynomorph_penetrated": { has: /^.+_penetrating_gynomorph$/ },
    "herm_penetrated": { has: /^.+_penetrating_herm$/ },
    "maleherm_penetrated": { has: /^.+_penetrating_maleherm$/ },
    "ambiguous_penetrated": { has: /^.+_penetrating_ambiguous$/ },

    // Activities
    "sex": { has: /^(.+_penetrating_.+|.+_penetration|.+_position|cunnilingus|fellatio|rimming)$/ },
    "rape": { has: [/^forced/, /rating:q|rating:e/] },
    "pregnant_sex": { has: ["pregnant", "sex"] },
    "penile_masturbation": { has: ["penis", "masturbation"] },
    "vaginal_masturbation": { has: ["pussy", "masturbation"] },
    "speech_bubble|thought_bubble": { has: "dialogue", },

    // Penis Parts
    "foreskin": { has: "humanoid_penis" },
    "glans": { has: "humanoid_penis" },
    "knot": { has: "canine_penis" },

}

export type SuggestionSet = {
    [tag: string]: TagSuggestion;
};

export type TagSuggestion = {
    has?: SuggestionParam;
    not?: SuggestionParam;
    matchCount?: number;
}

type SuggestionParam = RegExp | string | (RegExp | string)[];

export class TagSuggestionsTools {

    /** Converts regular expressions to a prefixed string */
    public static replacer(key: string, value: any): string {
        return (value instanceof RegExp)
            ? ("REGEXP:" + value.toString())
            : value;
    }

    /** Restores regular expressions from prefixed strings */
    public static reviver(key: string, value: string): any {
        if (value.toString().includes("REGEXP:")) {
            const parts = value.split("REGEXP:")[1].match(/\/(.*)\/(.*)?/);
            return new RegExp(parts[1], parts[2] || "");
        } else return value;
    }

}
