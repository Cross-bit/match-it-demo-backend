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
exports.Matching_sessions_history = void 0;
const typeorm_1 = require("typeorm");
let Matching_sessions_history = class Matching_sessions_history {
};
exports.Matching_sessions_history = Matching_sessions_history;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], Matching_sessions_history.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'uuid', nullable: false }),
    __metadata("design:type", String)
], Matching_sessions_history.prototype, "uuid", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { name: 'creation_size', nullable: false }),
    __metadata("design:type", Object)
], Matching_sessions_history.prototype, "creation_size", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { name: 'real_size', nullable: false }),
    __metadata("design:type", Object)
], Matching_sessions_history.prototype, "real_size", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'creation_time' }),
    __metadata("design:type", String)
], Matching_sessions_history.prototype, "creation_time", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'record_creation_time' }),
    __metadata("design:type", String)
], Matching_sessions_history.prototype, "record_creation_time", void 0);
exports.Matching_sessions_history = Matching_sessions_history = __decorate([
    (0, typeorm_1.Entity)('matching_sessions_history')
], Matching_sessions_history);
