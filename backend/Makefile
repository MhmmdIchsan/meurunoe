.PHONY: run build seed tidy deps start dev

APP_NAME=sim-sekolah

# Jalankan server development
run:
	go run ./server/main.go

# Hot reload (butuh air)
dev:
	air

# Build binary production
build:
	go build -o bin/$(APP_NAME) ./server/main.go

# Jalankan seeder (isi data awal: roles & admin)
seed:
	go run ./migrations/seeder/main.go

# Rapikan dependencies
tidy:
	go mod tidy

# Download dependencies
deps:
	go mod download

# Build + run (Linux / Git Bash)
start: build
	./bin/$(APP_NAME)
