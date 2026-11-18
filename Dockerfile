FROM node:22-bookworm-slim

WORKDIR /app

# Python for running Python projects + build tools for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    python3 g++ make \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p /app/project-files /app/data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
