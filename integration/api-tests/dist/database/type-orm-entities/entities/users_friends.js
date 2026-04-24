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
exports.Users_friends = void 0;
const typeorm_1 = require("typeorm");
let Users_friends = class Users_friends {
};
exports.Users_friends = Users_friends;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], Users_friends.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'token', nullable: false }),
    __metadata("design:type", String)
], Users_friends.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'user1_id', nullable: false }),
    __metadata("design:type", Number)
], Users_friends.prototype, "user1_id", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'user2_id', nullable: false }),
    __metadata("design:type", Number)
], Users_friends.prototype, "user2_id", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'creation_time' }),
    __metadata("design:type", String)
], Users_friends.prototype, "creation_time", void 0);
exports.Users_friends = Users_friends = __decorate([
    (0, typeorm_1.Entity)('users_friends')
], Users_friends);
