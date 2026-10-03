FROM python:3.12-slim@sha256:dddfd7e07f9d15aeeca61529320492139d21cac7f0070c00609243e51e4e0016

RUN pip install --no-cache-dir pyytlounge==3.4.0

WORKDIR /app
COPY app.py .

CMD ["python", "-u", "app.py"]
