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
Object.defineProperty(exports, "__esModule", { value: true });
exports.goodRegularUserData = void 0;
const types = __importStar(require("../entities/custom_enums"));
/**
 * Set of regular users with valid data
 */
exports.goodRegularUserData = [
    {
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        name: 'alice',
        email: 'alice@example.com',
        access_rights: types.userprivilegelevel.NORMAL,
        authentication_method: types.userauthenticationmethod.CREDENTIALS,
    },
    {
        id: 2,
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        name: 'bob',
        email: 'bob@example.com',
        access_rights: types.userprivilegelevel.NORMAL,
        authentication_method: types.userauthenticationmethod.CREDENTIALS,
    },
    {
        id: 3,
        uuid: '550e8400-e29b-41d4-a716-446655440002',
        name: 'charlie',
        email: 'charlie@example.com',
        access_rights: types.userprivilegelevel.NORMAL,
        authentication_method: types.userauthenticationmethod.CREDENTIALS,
    },
];
