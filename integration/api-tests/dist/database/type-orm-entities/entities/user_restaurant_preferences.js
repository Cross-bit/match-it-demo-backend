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
exports.User_restaurant_preferences = void 0;
const typeorm_1 = require("typeorm");
let User_restaurant_preferences = class User_restaurant_preferences {
};
exports.User_restaurant_preferences = User_restaurant_preferences;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], User_restaurant_preferences.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('character varying', { name: 'user_id', nullable: false }),
    __metadata("design:type", String)
], User_restaurant_preferences.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { name: 'avg_price_level' }),
    __metadata("design:type", Object)
], User_restaurant_preferences.prototype, "avg_price_level", void 0);
__decorate([
    (0, typeorm_1.Column)('smallint', { name: 'restaurant_type' }),
    __metadata("design:type", Object)
], User_restaurant_preferences.prototype, "restaurant_type", void 0);
__decorate([
    (0, typeorm_1.Column)('boolean', { name: 'vegetarian' }),
    __metadata("design:type", Object)
], User_restaurant_preferences.prototype, "vegetarian", void 0);
exports.User_restaurant_preferences = User_restaurant_preferences = __decorate([
    (0, typeorm_1.Entity)('user_restaurant_preferences')
], User_restaurant_preferences);
