export declare const contentRoot: string;
export interface SkillEntry {
    id: string;
    name: string;
    description: string;
    category: string;
}
export declare function getContentVersion(): number;
export declare function listSkills(opts?: {
    category?: string;
    filter?: string;
}): SkillEntry[];
export declare function getSkill(id: string): string | null;
export declare const listAgents: () => {
    id: string;
    name: string;
    description: string;
}[];
/** List internal agents (agents-internal/ directory). Each entry carries `internal: true`. */
export declare function listInternalAgents(): {
    id: string;
    name: string;
    description: string;
    internal: true;
}[];
export declare function getAgent(id: string): string | null;
export declare const listCommands: () => {
    id: string;
    name: string;
    description: string;
}[];
export declare const getCommand: (id: string) => string | null;
export declare const listRules: () => {
    id: string;
    name: string;
    description: string;
}[];
export declare const getRule: (id: string) => string | null;
export declare const resourceDefs: {
    uri: string;
    name: string;
    description: string;
    path: string;
    mimeType: string;
}[];
export declare function getResource(uri: string): {
    text: string;
    mimeType: string;
} | null;
