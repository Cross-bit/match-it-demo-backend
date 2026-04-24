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
exports.Users_groups = void 0;
const typeorm_1 = require("typeorm");
let Users_groups = class Users_groups {
};
exports.Users_groups = Users_groups;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], Users_groups.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'uuid', nullable: false }),
    __metadata("design:type", String)
], Users_groups.prototype, "uuid", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'user_id', nullable: false }),
    __metadata("design:type", Number)
], Users_groups.prototype, "user_id", void 0);
exports.Users_groups = Users_groups = __decorate([
    (0, typeorm_1.Entity)('users_groups')
], Users_groups);
