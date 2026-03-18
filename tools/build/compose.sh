#!/bin/bash

#
# ================================================================
# !!!! CAUTION !!!!
# ================================================================
# This script is **STRICTLY** executed from the **PROJECT ROOT DIRECTORY**
# (not from the current directory)
# Root directory is identified by the .git directory.
# ================================================================


# =================================================================================
# DESCRIPTION
# ==================================================================================
# Runs docker compose with specified command for dev/prod/test/staging environment.
# Expected usage: ./compose.sh [--dev|--dev2] [docker commands]
#
# Example: ./compose.sh --dev build, builds development version of the app.
#
# NOTE: To update specific environment dependencies look up the "Args parsing" section in this file.


set -eEuo pipefail
trap 'if [ $? -ne 0 ]; then echo "Project build failed."; fi' EXIT


# Var definitions and helper functions
# =====================================

env_files=""
compose_files=""

# User defined docker compose commands and switches to execute (e.g. build, up, down, -d, ... )
docker_commands=""

# Prepends each value in string of option values separated by space with the option's name
# $1 - string of values separated by spaces
# $2 - option name
prepend_with_option() {
    local files=$1  # The list of files to check
    local option_name=$2
    local arg_string=""  # Initialize the arg_string variable

    for file in $files; do
        if [ ! -f "$file" ]; then
            echo "Missing file: $file ..." >&2
            exit 1
        fi

        arg_string+=" $option_name $file"  # Append the file to the argument string
    done

    # Return the resulting arg_string
    echo "$arg_string"
}


# Args parsing
# =====================================

if [[ $# -eq 0 ]]; then
    echo "Error: Not enough arguments."
    $0 --help
    exit 1
fi

while [[ $# -gt 0 ]]; do
    case "$1" in
    -d|--dev)
        # list of env and compose files for development
        env_files=(".env.dev")
        compose_files=("docker-compose.dev.yaml ./databases/docker-compose-db.dev.yaml")
        shift
        ;;
    -d2|--dev2)
        # skips databases
        env_files=(".env.dev")
        compose_files=("docker-compose.dev.yaml")
        shift
        ;;
    --help)
        echo "Command usage"
        echo "./compose.sh [-d|--dev; -p|--prod; -t|--test; -s|--staging] [docker compose commands]"
        echo "Description:"
        echo "Runs docker compose command for the specified environment."
        echo "Basic options:"
        echo "-d|--dev - for the local development"
        echo "-d|--dev2 - for the local development environment excluding database (so the database container won't be affected)"
        echo "(For more consult the source.)"
        exit 0
        ;;
    *)
        docker_commands+=" $1"
        shift
        ;;
    esac
done

if [ -z "$env_files" ] || [ -z "$compose_files" ]; then
    echo "No build files specified..."
    exit 1
fi

# EXECUTION:
# ===========================

# Always start the execution from the project (the backend's) root directory
script_dir=$(git rev-parse --show-toplevel)
cd $script_dir

# execute docker compose
echo "Checking environment:"
docker compose version

# compose the docker compose command arguments
ENV_ARGS=$(prepend_with_option "$env_files" "--env-file")
COMPOSE_ARGS=$(prepend_with_option "$compose_files" "-f")

echo $ENV_ARGS
echo $COMPOSE_ARGS

docker compose $ENV_ARGS $COMPOSE_ARGS $docker_commands






