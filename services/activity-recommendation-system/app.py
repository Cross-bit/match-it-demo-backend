import logging
from dotenv import load_dotenv
from flask import app

# ================================
# DESCRIPTIONS
# ================================
# Main entry point for the flask REST API application.
#

# Setu up the logging.
logging.basicConfig(level=logging.INFO)

# Make sure any additional envs are loaded from the .env file.
load_dotenv()

from src import flaskApp

##################################################
################################################
##
## FLASK APPLICATION
##
##########################################
#######################################

if __name__ == "__main__":
    logging.info("Starting Flask app")
    flaskApp.run(debug=True, port=9070, host="0.0.0.0")
