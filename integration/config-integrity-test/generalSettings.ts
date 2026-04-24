import { execSync } from 'child_process'
import path from 'path'

/** ================================
 * DESCRIPTION
 * =================================
 * Contains general settings for the integrity testing.
 */

// Specifies all the services/git repository root directory
export const PROJECT_ROOT = getProjectRoot()

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
