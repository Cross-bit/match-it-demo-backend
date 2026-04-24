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
exports.Matching_session_users = void 0;
const typeorm_1 = require("typeorm");
let Matching_session_users = class Matching_session_users {
};
exports.Matching_session_users = Matching_session_users;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], Matching_session_users.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'session_id', nullable: false }),
    __metadata("design:type", Number)
], Matching_session_users.prototype, "session_id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'user_uuid', nullable: false }),
    __metadata("design:type", String)
], Matching_session_users.prototype, "user_uuid", void 0);
__decorate([
    (0, typeorm_1.Column)('boolean', { name: 'is_connected', nullable: false }),
    __metadata("design:type", Object)
], Matching_session_users.prototype, "is_connected", void 0);
__decorate([
    (0, typeorm_1.Column)('boolean', { name: 'is_creator', nullable: false }),
    __metadata("design:type", Object)
], Matching_session_users.prototype, "is_creator", void 0);
exports.Matching_session_users = Matching_session_users = __decorate([
    (0, typeorm_1.Entity)('matching_session_users')
], Matching_session_users);
