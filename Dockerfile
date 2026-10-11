# syntax=docker/dockerfile:1

# ---- build: compile the client and bundle the server into a single file --------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VERSION=""
RUN if [ -n "$VERSION" ]; then npm version "$VERSION" --no-git-tag-version --allow-same-version; fi \
 && npm run build \
 && npm run build:bundle

# ---- runtime: no node_modules needed, the server is one bundled file ------------------------
FROM node:22-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 NO_BROWSER=1 QUIET=1
WORKDIR /app
COPY --from=build /app/dist/bundle/server.cjs ./dist/bundle/server.cjs
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/static ./static
COPY --from=build /app/fonts ./fonts
COPY --from=build /app/templates ./templates
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/bundle/server.cjs"]
