COMPOSE ?= docker compose
SERVICE ?= server

.PHONY: up down migrate-up migrate-down logs shell build

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

migrate-up:
	$(COMPOSE) run --rm $(SERVICE) npx knex migrate:latest

migrate-down:
	$(COMPOSE) run --rm $(SERVICE) npx knex migrate:rollback

logs:
	$(COMPOSE) logs -f $(SERVICE)

shell:
	$(COMPOSE) run --rm $(SERVICE) sh
