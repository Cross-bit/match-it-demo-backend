"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Group_members_relations = void 0;
const typeorm_1 = require("typeorm");
let Group_members_relations = class Group_members_relations {
};
exports.Group_members_relations = Group_members_relations;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], Group_members_relations.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'group_id' }),
    __metadata("design:type", Number)
], Group_members_relations.prototype, "group_id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'user_uuid', nullable: false }),
    __metadata("design:type", String)
], Group_members_relations.prototype, "user_uuid", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'creation_time' }),
    __metadata("design:type", String)
], Group_members_relations.prototype, "creation_time", void 0);
exports.Group_members_relations = Group_members_relations = __decorate([
    (0, typeorm_1.Entity)('group_members_relations')
], Group_members_relations);
