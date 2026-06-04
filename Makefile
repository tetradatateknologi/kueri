.PHONY: dev dev-api dev-web install docker-up docker-down

dev:
	@$(MAKE) -j2 dev-api dev-web

dev-api:
	$(MAKE) -C api run

dev-web:
	@cd web && if command -v bun >/dev/null 2>&1; then bun run dev; else npm run dev; fi

install:
	@cd web && if command -v bun >/dev/null 2>&1; then bun install; else npm install; fi
	$(MAKE) -C api build

docker-up:
	docker compose up -d

docker-down:
	docker compose down
