"use strict";
/* =================================================
* DESCRIPTION
* ==================================================
* Helper script to mock users authentication tokens.
*
* )
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
exports.generateAccessToken = exports.UserPrivileges = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const settings = __importStar(require("../generalSettings"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const envVars = (() => {
    const res = dotenv_1.default.config({ path: settings.ENV_FILE });
    if (res.error)
        throw res.error;
    return res.parsed;
})();
var UserPrivileges;
(function (UserPrivileges) {
    UserPrivileges["NORMAL"] = "NORMAL";
    UserPrivileges["ADMIN"] = "ADMIN";
    UserPrivileges["TESTER"] = "TESTER";
})(UserPrivileges || (exports.UserPrivileges = UserPrivileges = {}));
;
const generateAccessToken = (userUUID, userEmail, privilidge) => {
    const ACCESS_TOKEN_SECRET = envVars === null || envVars === void 0 ? void 0 : envVars.ACCESS_TOKEN_SECRETE;
    if (!ACCESS_TOKEN_SECRET) {
        console.error("REFRESH_TOKEN_SECRETE env was null, during credentials log in. ACCESS_TOKEN_SECRETE env not set.");
        throw new Error("Fatal internal server error while trying to log in.");
    }
    const SERVICE_IDENTIFIER = envVars === null || envVars === void 0 ? void 0 : envVars.USER_ACCOUNT_SERVICE_IDENTIFIER;
    const ACCESS_TOKEN_EXPIRATION_TIME = envVars === null || envVars === void 0 ? void 0 : envVars.ACCESS_TOKEN_EXPIRATION_TIME;
    if (!SERVICE_IDENTIFIER) {
        console.error("JWT access token was null, during credentials log in. IDENTIFIER env not set.");
        throw new Error("Fatal internal server error while trying to log in.");
    }
    return jsonwebtoken_1.default.sign({
        email: userEmail,
        privilidge: privilidge,
        isRefresh: false
    }, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRATION_TIME,
        subject: userUUID,
        issuer: SERVICE_IDENTIFIER
    });
};
exports.generateAccessToken = generateAccessToken;
