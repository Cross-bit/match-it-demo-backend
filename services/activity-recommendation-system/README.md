
# Recommendation system service

This is the service that computes next deck of activity cards for given user.

## Instalation and run

The root .gitignore and .dockerignore is set to ignore virtual env, in the `venv` directory.
So in order to start the service first create such a local environment.

`python3 -m venv venv`

To start the `venv` (linux):

`source ./venv/bin/activate`

To install all dependencies (once the venv was started):

`pip install -r ./requirements.txt`


If you add some new package, please always refresh the `requirements.txt` file using
`pip freeze > requirements.txt`


(note this is only for us linux users :-))