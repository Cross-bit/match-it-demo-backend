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
exports.Users_refresh_tokens = void 0;
const typeorm_1 = require("typeorm");
let Users_refresh_tokens = class Users_refresh_tokens {
};
exports.Users_refresh_tokens = Users_refresh_tokens;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], Users_refresh_tokens.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'user_id', nullable: false }),
    __metadata("design:type", Number)
], Users_refresh_tokens.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)('character varying', { name: 'refresh_token' }),
    __metadata("design:type", String)
], Users_refresh_tokens.prototype, "refresh_token", void 0);
exports.Users_refresh_tokens = Users_refresh_tokens = __decorate([
    (0, typeorm_1.Entity)('users_refresh_tokens')
], Users_refresh_tokens);
