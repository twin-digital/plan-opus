import type { Entity } from '@minecraft/server';
export interface FakeEntity extends Entity {
}
export declare class FakeEntity {
    readonly typeId: string;
    constructor(typeId: string);
    kill(): boolean;
}
export declare function createEntity(typeId: string): Entity;
