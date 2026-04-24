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
exports.Movie_ratings = void 0;
const typeorm_1 = require("typeorm");
let Movie_ratings = class Movie_ratings {
};
exports.Movie_ratings = Movie_ratings;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'int' }),
    __metadata("design:type", Number)
], Movie_ratings.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('character varying', { name: 'user_id', nullable: false }),
    __metadata("design:type", String)
], Movie_ratings.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'movie_id', nullable: false }),
    __metadata("design:type", Number)
], Movie_ratings.prototype, "movie_id", void 0);
__decorate([
    (0, typeorm_1.Column)('smallint', { name: 'rating', nullable: false }),
    __metadata("design:type", Object)
], Movie_ratings.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'creation_time' }),
    __metadata("design:type", String)
], Movie_ratings.prototype, "creation_time", void 0);
exports.Movie_ratings = Movie_ratings = __decorate([
    (0, typeorm_1.Entity)('movie_ratings')
], Movie_ratings);
