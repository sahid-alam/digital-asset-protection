FROM python:3.11-slim
WORKDIR /app

# Install CPU-only torch first to avoid pulling in 2GB of CUDA libraries
RUN pip install --no-cache-dir \
    torch==2.2.2+cpu torchvision==0.17.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
