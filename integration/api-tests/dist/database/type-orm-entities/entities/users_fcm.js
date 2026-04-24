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
exports.Users_fcm = void 0;
const typeorm_1 = require("typeorm");
let Users_fcm = class Users_fcm {
};
exports.Users_fcm = Users_fcm;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], Users_fcm.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'user_id', nullable: false }),
    __metadata("design:type", Number)
], Users_fcm.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)('character varying', { name: 'fcm_token' }),
    __metadata("design:type", String)
], Users_fcm.prototype, "fcm_token", void 0);
exports.Users_fcm = Users_fcm = __decorate([
    (0, typeorm_1.Entity)('users_fcm')
], Users_fcm);
