SHELL=/bin/bash

.PHONY: help
help: ## display help section
	@ cat $(MAKEFILE_LIST) | grep -e "^[a-zA-Z_\-]*: *.*## *" | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: prepare
prepare: ## upload secrets and database schemes
	@ npx wrangler secret put BOT_TOKEN
	@ npx wrangler d1 execute db --remote --file=./sql/schema.sql

.PHONY: deploy
deploy:
	@ npx wrangler deploy
