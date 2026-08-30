# This is a stdio client adapter to the existing public polity, not a new site.
# Run one container per MCP client; no database or credentials are bundled.
FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node scripts/mcp-stdio.mjs ./scripts/mcp-stdio.mjs
USER node
CMD ["node", "scripts/mcp-stdio.mjs"]
