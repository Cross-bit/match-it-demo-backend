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
exports.Users_data = void 0;
const typeorm_1 = require("typeorm");
let Users_data = class Users_data {
};
exports.Users_data = Users_data;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], Users_data.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'user_id', nullable: false }),
    __metadata("design:type", Number)
], Users_data.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)('character varying', { name: 'thumbnail_name' }),
    __metadata("design:type", String)
], Users_data.prototype, "thumbnail_name", void 0);
__decorate([
    (0, typeorm_1.Column)('character varying', { name: 'name' }),
    __metadata("design:type", String)
], Users_data.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('char', { name: 'sex' }),
    __metadata("design:type", Object)
], Users_data.prototype, "sex", void 0);
__decorate([
    (0, typeorm_1.Column)('smallint', { name: 'age' }),
    __metadata("design:type", Object)
], Users_data.prototype, "age", void 0);
exports.Users_data = Users_data = __decorate([
    (0, typeorm_1.Entity)('users_data')
], Users_data);
