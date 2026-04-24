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
exports.Pending_friend_requests = void 0;
const typeorm_1 = require("typeorm");
let Pending_friend_requests = class Pending_friend_requests {
};
exports.Pending_friend_requests = Pending_friend_requests;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], Pending_friend_requests.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'uuid', nullable: false }),
    __metadata("design:type", String)
], Pending_friend_requests.prototype, "uuid", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'user_id', nullable: false }),
    __metadata("design:type", Number)
], Pending_friend_requests.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'friend_id', nullable: false }),
    __metadata("design:type", Number)
], Pending_friend_requests.prototype, "friend_id", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'creation_time' }),
    __metadata("design:type", String)
], Pending_friend_requests.prototype, "creation_time", void 0);
exports.Pending_friend_requests = Pending_friend_requests = __decorate([
    (0, typeorm_1.Entity)('pending_friend_requests')
], Pending_friend_requests);
