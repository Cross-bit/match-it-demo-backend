"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FRIENDS_SERVICE_BASE_URL = exports.TEST_DOCKER_HOST_IP = exports.ENV_VARS = exports.ENV_FILE = exports.PROJECT_ROOT = void 0;
const child_process_1 = require("child_process");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
/** ================================
 * DESCRIPTION
 * =================================
 * Contains general settings for the api testing.
*/
// Specifies all the services/git repository root directory
exports.PROJECT_ROOT = getProjectRoot();
// The environment variable file used for the testing
exports.ENV_FILE = path_1.default.join(exports.PROJECT_ROOT, '.env.test');
exports.ENV_VARS = loadEnvVariables();
// this is actually the real ip on which the docker is running for the outside user
exports.TEST_DOCKER_HOST_IP = '127.0.0.1'; // NOTE: since docker requires to use names of the containers from within the containers the env.test vars can't be used here...
exports.FRIENDS_SERVICE_BASE_URL = getFriendsServiceUrl();
//export const FRIENDS_API_BASE_URL = `${FRIENDS_SERVICE_BASE_URL}/api/v1`
function getFriendsServiceUrl() {
    return `${exports.TEST_DOCKER_HOST_IP}:${exports.ENV_VARS === null || exports.ENV_VARS === void 0 ? void 0 : exports.ENV_VARS.FRIENDSHIP_SERVICE_API_PORT}`;
}
function loadEnvVariables() {
    const res = dotenv_1.default.config({ path: exports.ENV_FILE });
    if (res.error)
        throw res.error;
    return res.parsed;
}
/**
 * Gets project root based on the .git directory location.
 * @returns project root absolute path
 */
function getProjectRoot() {
    try {
        // Get the absolute path of the project root
        const rootPath = (0, child_process_1.execSync)('git rev-parse --show-toplevel').toString().trim();
        return rootPath;
    }
    catch (err) {
        console.error('Error: Not a git repository or git is not available.');
        process.exit(1);
    }
}
