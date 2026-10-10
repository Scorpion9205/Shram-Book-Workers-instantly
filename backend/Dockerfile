FROM node:20-slim

WORKDIR /app

# argon2/bcrypt have native bindings — build tools let npm compile them if no
# prebuilt binary matches this platform instead of failing the install.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# NODE_ENV=production isn't set yet at this point on purpose — npm treats it as an implicit
# --omit=dev and silently skips devDependencies (typescript, @types/*, vitest), which breaks
# the build below. It's set further down, right before the app actually starts.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

# prisma.config.ts resolves DATABASE_URL eagerly even for `generate`, which only reads the
# schema and never actually connects — a placeholder satisfies that resolution at build time.
# Render injects the real DATABASE_URL at container runtime, which is all that matters for
# the actual migrate/start step below.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN npx prisma generate
RUN npm run build

# Drop devDependencies now that the build output + generated Prisma client exist —
# keeps the final image smaller without touching the already-compiled native modules.
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 5000

# Applies any pending migrations before the process starts serving traffic. Safe to
# run on every deploy — a no-op when the schema is already up to date.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
