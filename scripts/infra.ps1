# FreightPulse — PowerShell helper scripts (replaces Makefile on Windows)
# Usage: .\scripts\infra-up.ps1

param(
    [string]$Action = "infra-up"
)

$ErrorActionPreference = "Stop"

function Check-Docker {
    try {
        $null = docker version 2>&1
        return $true
    } catch {
        Write-Host "❌ Docker is not running or not installed." -ForegroundColor Red
        Write-Host "   Please open Docker Desktop from the Start menu and wait for it to start." -ForegroundColor Yellow
        Write-Host "   (Look for the whale 🐳 icon in the system tray)" -ForegroundColor Yellow
        return $false
    }
}

switch ($Action) {
    "infra-up" {
        if (-not (Check-Docker)) { exit 1 }
        Write-Host "🚀 Starting FreightPulse infrastructure..." -ForegroundColor Cyan
        docker compose up -d redpanda neo4j timescaledb redis
        Write-Host ""
        Write-Host "⏳ Waiting for Redpanda to initialise topics (30s)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        docker compose up redpanda-init
        Write-Host ""
        Write-Host "✅ Infrastructure ready!" -ForegroundColor Green
        Write-Host "   Redpanda (Kafka): localhost:19092" -ForegroundColor Gray
        Write-Host "   Neo4j browser:    http://localhost:7474" -ForegroundColor Gray
        Write-Host "   TimescaleDB:      localhost:5432" -ForegroundColor Gray
        Write-Host "   Redis:            localhost:6379" -ForegroundColor Gray
    }
    "infra-down" {
        if (-not (Check-Docker)) { exit 1 }
        Write-Host "🛑 Stopping FreightPulse infrastructure..." -ForegroundColor Yellow
        docker compose down
        Write-Host "✅ Infrastructure stopped." -ForegroundColor Green
    }
    "infra-logs" {
        if (-not (Check-Docker)) { exit 1 }
        docker compose logs -f redpanda neo4j timescaledb redis
    }
    "status" {
        if (-not (Check-Docker)) { exit 1 }
        docker compose ps
    }
    default {
        Write-Host "Usage: .\scripts\infra.ps1 [infra-up|infra-down|infra-logs|status]"
    }
}
