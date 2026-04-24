import * as settings from '../generalSettings'
import { execSync } from 'child_process'
import path from 'path'
import dotenv from 'dotenv'
import fs from 'fs'


const ENV_FILES_TO_TEST = ['.env.prod', '.env.test']
const EXAMPLE_FILE = path.join(settings.PROJECT_ROOT, '.env.example')


// Read the example env file to get required keys
if (!fs.existsSync(EXAMPLE_FILE)) {
    throw new Error(`❌ Missing ${EXAMPLE_FILE} file!`);
}

// get actual file paths
const envFilePaths = ENV_FILES_TO_TEST.map((fileName) => path.join(settings.PROJECT_ROOT, fileName))

const exampleVars = dotenv.parse(fs.readFileSync(EXAMPLE_FILE));
// Load the required keys files should contain
const requiredKeys = Object.keys(exampleVars);



describe('Check env files exist.', () => {
    envFilePaths.forEach((file) => {
        test(`Checking ${file} against ${EXAMPLE_FILE}`, () => {
            expect(fs.existsSync(file)).toBe(true);
        })
    })
})

describe('Environment variable integrity check', () => {
    envFilePaths.forEach((file) => {

    test(`Checking ${file} against ${EXAMPLE_FILE}`, () => {

            if (!fs.existsSync(file)) {
                console.warn(`⚠️ Warning: ${file} does not exist. Skipping.`);
                return;
            }

            const envVars = dotenv.parse(fs.readFileSync(file));
            const envKeys = Object.keys(envVars);
            const missingKeys = requiredKeys.filter((key) => !envKeys.includes(key));

            expect(missingKeys).toHaveLength(0); // Fail if missing keys exist
        });
    });
});

