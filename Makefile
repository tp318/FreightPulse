.PHONY: infra-up infra-down dev help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

infra-up: ## Start all infrastructure services (Redpanda, Neo4j, TimescaleDB, Redis)
	docker-compose up -d redpanda neo4j timescaledb redis
	@echo "Waiting for Redpanda to be healthy..."
	@docker-compose up redpanda-init
	@echo "✅ Infrastructure ready!"
	@echo "  Redpanda (Kafka): localhost:19092"
	@echo "  Neo4j browser:    http://localhost:7474"
	@echo "  TimescaleDB:      localhost:5432"
	@echo "  Redis:            localhost:6379"

infra-down: ## Stop all infrastructure services
	docker-compose down

infra-logs: ## Tail infrastructure logs
	docker-compose logs -f redpanda neo4j timescaledb redis

backend-dev: ## Start backend (requires infra to be running)
	cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

frontend-dev: ## Start frontend dev server
	cd frontend && npm run dev

dev: infra-up ## Start full stack (infra + backend + frontend)
	@echo "Starting backend and frontend..."
	@start cmd /k "cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
	@start cmd /k "cd frontend && npm run dev"
	@echo "✅ Full stack started!"
	@echo "  Backend:  http://localhost:8000"
	@echo "  Frontend: http://localhost:5173"
