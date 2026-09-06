# Custom Caddy build with the rate_limit directive (caddy-ratelimit plugin),
# which stock Caddy does not include. Spec: rate limiting lives at the proxy.
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/mholt/caddy-ratelimit

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy