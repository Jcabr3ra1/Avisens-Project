FROM python:3.12-slim

WORKDIR /app

# Las dependencias van antes que el codigo: mientras requirements.txt no
# cambie, Docker reutiliza esta capa y no reinstala nada en cada build.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# El proceso no corre como root: si alguien lograra ejecutar codigo dentro del
# contenedor, no tendria permisos sobre el sistema de archivos de la imagen.
RUN useradd --create-home --uid 1001 avisens && chown -R avisens:avisens /app
USER avisens

# No escribir .pyc ni bufferear la salida: los logs salen en el momento, que es
# lo que espera `docker compose logs`.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health').read()" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
