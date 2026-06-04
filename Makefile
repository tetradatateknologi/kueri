.PHONY: dev dev-api dev-web install docker-up docker-down desktop-prepare desktop-build desktop-dev release-manifest

VERSION := $(shell tr -d '[:space:]' < VERSION)

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

desktop-prepare:
	@cd web && VITE_DESKTOP_BUILD=1 npm run build
	@rm -rf api/internal/desktop/webdist
	@mkdir -p api/internal/desktop/webdist
	@cp -R web/dist/. api/internal/desktop/webdist/

desktop-build: desktop-prepare
	$(MAKE) -C api desktop-build VERSION=$(VERSION)

desktop-dev: desktop-build
	@KUERI_NO_BROWSER=0 api/bin/kueri-desktop

release-manifest:
	@test -n "$(ARTIFACT_DIR)" || (echo "Usage: make release-manifest ARTIFACT_DIR=dist/release" && exit 1)
	@./scripts/gen-release-manifest.sh "$(ARTIFACT_DIR)"
