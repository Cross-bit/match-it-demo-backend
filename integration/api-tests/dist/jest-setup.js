"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const entities_generator_1 = require("./database/type-orm-entities/entities-generator");
const path_1 = require("path");
const settings = __importStar(require("./generalSettings"));
function generateEntities() {
    return __awaiter(this, void 0, void 0, function* () {
        // Path original .sql files with tables definitions
        const DB_TABLE_SCRIPTS = (0, path_1.join)(settings.PROJECT_ROOT, "databases/postgresql/db1/init/");
        const ENTITIES_OUT_DIR = (0, path_1.join)(__dirname, "database/type-orm-entities/entities");
        const filesNames = fs_1.default.readdirSync(DB_TABLE_SCRIPTS)
            .filter(file => file.endsWith('.sql')) // Ensure we only get .sql files
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(1);
        for (const fileName of filesNames) {
            const filePath = (0, path_1.join)(DB_TABLE_SCRIPTS, fileName);
            (0, entities_generator_1.sqlToTypeOrmEntities)(filePath, ENTITIES_OUT_DIR);
        }
    });
}
// Export the function as required by Jest's globalSetup
module.exports = generateEntities;
