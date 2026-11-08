# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# OccasionHub edge proxy (web tier): Nginx in front of the Next.js front end.
#  - serves the site on port 8080 as a NON-root user (nginx-unprivileged)
#  - proxies /backend/* to the PRIVATE application tier (internal ALB on AWS)
#  - caches immutable Next.js assets and venue photos, gzips text responses
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Defaults suit docker compose; on AWS the launch template overrides
# API_UPSTREAM with the internal load balancer's DNS name.
ENV CLIENT_UPSTREAM=client:3000 \
    API_UPSTREAM=server:3002 \
    NGINX_RESOLVER=127.0.0.11

# The image's entrypoint renders /etc/nginx/templates/*.template with envsubst
# into /etc/nginx/conf.d at start-up (only the variables defined above).
COPY --chown=nginx:nginx templates/ /etc/nginx/templates/
COPY --chown=nginx:nginx snippets/ /etc/nginx/snippets/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
