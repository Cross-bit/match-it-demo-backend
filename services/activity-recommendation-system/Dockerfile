# Stage 1: Development stage
FROM python:3.10-slim AS builder

WORKDIR /application-recommendation-system

# System dependencies for scikit-surprise + psycopg2
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    gfortran \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# upgrade pip + build tools first
RUN pip install --upgrade pip setuptools wheel cython numpy

RUN pip install --no-cache-dir -r requirements.txt
RUN pip install debugpy

COPY . .

EXPOSE 9070

CMD ["python", "app.py"]

# Stage 2: Production stage
FROM python:3.10-slim AS production

# ------------------------------------------------------------------
# Limit internal threading of BLAS / NumPy / MKL.
# This prevents CPU oversubscription when using Gunicorn threads
# (e.g. gthread worker) with heavy NumPy operations.
#
# We want concurrency to be controlled by Gunicorn, not by BLAS.
# ------------------------------------------------------------------
ENV OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1

WORKDIR /application-recommendation-system

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    gfortran \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip setuptools wheel cython numpy
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

COPY . .

EXPOSE 9070

CMD [ \
    "gunicorn", \
    "-k", "gthread", \
    "--threads", "6", \
    "--timeout", "120", \
    "--bind", "0.0.0.0:9070", \
    "src:flaskApp" \
]
