import { execSync } from 'child_process'
import { DotenvParseOutput } from 'dotenv'
import dotenv from 'dotenv'
import path from 'path'

/** ================================
 * DESCRIPTION
 * =================================
 * Contains general settings for the api testing.
*/

// Specifies all the services/git repository root directory
export const PROJECT_ROOT = getProjectRoot()

// The environment variable file used for the testing (change it to your own for local testing if needed default is .env.test)
export const ENV_FILE = path.join(PROJECT_ROOT, '.env.test')

export const ENV_VARS = loadEnvVariables()

// this is actually the real ip on which the docker is running for the outside user
export const TEST_DOCKER_HOST_IP='127.0.0.1' // NOTE: since docker requires to use names of the containers from within the containers the env.test vars can't be used here...

export const FRIENDS_SERVICE_BASE_URL = getFriendsServiceUrl()

export const RECOMMENDATION_SERVICE_BASE_URL = getActivityRecommendationServiceUrl()
//export const FRIENDS_API_BASE_URL = `${FRIENDS_SERVICE_BASE_URL}/api/v1`

function getFriendsServiceUrl() {
    return `${TEST_DOCKER_HOST_IP}:${ENV_VARS?.FRIENDSHIP_SERVICE_API_PORT}`
}

function getActivityRecommendationServiceUrl() {
    return `${TEST_DOCKER_HOST_IP}:${ENV_VARS?.ACTIVITY_RECOMMENDATION_SYSTEM_PORT}`
}

function loadEnvVariables() {
    const res = dotenv.config({ path: ENV_FILE })

    if (res.error)
        throw res.error

    return res.parsed
}

/**
 * Gets project root based on the .git directory location.
 * @returns project root absolute path
 */
function getProjectRoot() {
    try {
        // Get the absolute path of the project root
        const rootPath = execSync('git rev-parse --show-toplevel').toString().trim();
        return rootPath;
    } catch (err) {
        console.error('Error: Not a git repository or git is not available.');
        process.exit(1);
    }
}


