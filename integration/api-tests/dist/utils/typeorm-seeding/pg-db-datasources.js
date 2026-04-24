"use strict";
/* ======================================
* DESCRIPTION
* =====================================
* Provides interfaces to create connections
* to pg databases using typeorm.
*
*/
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypeOrmMainDatabase1DataSource = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const settings = __importStar(require("../../generalSettings"));
const typeorm_1 = require("typeorm");
const path_1 = require("path");
const envVars = (() => {
    const res = dotenv_1.default.config({ path: settings.ENV_FILE });
    if (res.error)
        throw res.error;
    return res.parsed;
})();
const main_db1_user = envVars === null || envVars === void 0 ? void 0 : envVars.MAIN_DB_USER;
const main_db1_password = envVars === null || envVars === void 0 ? void 0 : envVars.MAIN_DB_PASS;
const main_db1_database = envVars === null || envVars === void 0 ? void 0 : envVars.MAIN_DB_NAME;
const main_db1_host = settings.TEST_DOCKER_HOST_IP; // important to use this address because of docker's container internal network policies...
const main_db1_port = +(envVars === null || envVars === void 0 ? void 0 : envVars.MAIN_DB_PORT);
const getTypeOrmMainDatabase1DataSource = () => {
    return new typeorm_1.DataSource({
        type: 'postgres',
        host: main_db1_host,
        port: main_db1_port,
        username: main_db1_user,
        password: main_db1_password,
        database: main_db1_database,
        synchronize: false,
        entities: [(0, path_1.join)(__dirname, '../../database/type-orm-entities/entities/*.ts')],
    });
};
exports.getTypeOrmMainDatabase1DataSource = getTypeOrmMainDatabase1DataSource;
