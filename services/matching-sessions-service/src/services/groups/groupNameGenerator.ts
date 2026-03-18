/**
 * ======================================================
 * DESCRIPTION
 * =======================================================
 * Provides interface for generating dummy group names.
 *
 * For clients provides simple factory interface for creation.
 * (at the bottom of this file)
 *
 */

export abstract class NameGenerator {
    abstract generate(): string;
}

export class RandomHashNameGenerator extends NameGenerator {

    generate(): string {
        const randHash = Math.random().toString(36).substring(2, 6);
        return randHash;
    }
}

export class RandomGroupReadableComposeNameGenerator extends NameGenerator {
    constructor(
        private adjectives = ["blue", "fast", "happy"],
        private nouns = ["fox", "tiger", "eagle"]
    ) {
        super();
    }

    generate(): string {
        const adj = this.pick(this.adjectives);
        const noun = this.pick(this.nouns);
        return `${adj} ${noun}`;
    }

    private pick<T>(arr: T[]): T {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}


/*
* FACTORY
*/

export enum NameGeneratorType {
    HASH = "hash",
    GROUP_READABLE = "group_readable",
}

export class NameGeneratorFactory {
    // dummy group names dicts
    private static adjectives: string[] = [
        "White", "Golden", "Fast", "Wild", "Silent", "Crimson",
        "Blue", "Silver", "Rising", "Burning", "Stormy", "Fierce",
        "Brave", "Shining", "Frost", "Midnight", "Solar", "Iron",
        "Gentle", "Mighty", "Lunar", "Shadow", "Radiant", "Frozen",
        "Clever"
    ];

    private static nouns: string[] = [
        "Tigers", "Wolves", "Foxes", "Owls", "Lions", "Eagles",
        "Ravens", "Hawks", "Bears", "Panthers", "Dolphins",
        "Horses", "Stags", "Sharks", "Snakes", "Falcons", "Dragons",
        "Bulls", "Crows", "Otters", "Seals", "Beavers", "Swans",
        "Cranes", "Jackals", "Warthogs"
    ];

    static create(type: NameGeneratorType): NameGenerator {

    switch (type) {
        case NameGeneratorType.HASH:
        return new RandomHashNameGenerator();

        case NameGeneratorType.GROUP_READABLE:
        return new RandomGroupReadableComposeNameGenerator(
            this.adjectives,
            this.nouns
        );

        default:
        throw new Error(`Unknown generator type: ${type}`);
    }
    }
}

//const groupGen = NameGeneratorFactory.create(NameGeneratorType.GROUP_READABLE);
//console.log(groupGen.generate());