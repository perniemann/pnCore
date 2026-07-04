---
name: pn-go-scaffolding
description: "Scaffolds new Go API projects (Gin, Fiber, Echo, Chi) or handlers. Use when adding a new route/module; covers idiomatic project layout, env/secrets, error handling, and Go-specific conventions."
---

# Go backend scaffolding

## When to use

- Starting a new Go API project.
- Adding a new handler, route group, or domain package.
- Establishing project structure from scratch.

## Project structure

```
# Standard Go layout
cmd/
  server/
    main.go           # Entry point: init config, DB, router, start server
internal/
  users/
    handler.go        # HTTP handlers for the users domain
    service.go        # Business logic
    repository.go     # DB queries for users
    model.go          # User struct + domain types
  orders/
    handler.go
    service.go
    repository.go
  middleware/
    auth.go
    logger.go
    recover.go
  config/
    config.go         # Typed config from env vars
  db/
    db.go             # DB connection pool setup
  apierr/
    errors.go         # Sentinel errors + HTTP mapping
go.mod
go.sum
.env.example
```

- `cmd/` for binary entry points.
- `internal/` for everything that is not a public library. Prevents external packages from importing your internals.
- Never put business logic in `main.go`.

## Gin scaffold

```go
// internal/users/handler.go
package users

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"yourmodule/internal/apierr"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("", h.Create)
	rg.GET("/:id", h.GetByID)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "BAD_REQUEST", "message": err.Error()}})
		return
	}
	user, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		apierr.Respond(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": user})
}

func (h *Handler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "BAD_REQUEST", "message": "Invalid ID"}})
		return
	}
	user, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		apierr.Respond(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": user})
}
```

```go
// internal/apierr/errors.go
package apierr

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

var (
	ErrNotFound   = errors.New("not found")
	ErrForbidden  = errors.New("forbidden")
	ErrConflict   = errors.New("conflict")
)

func Respond(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": err.Error()}})
	case errors.Is(err, ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "FORBIDDEN", "message": "Access denied"}})
	case errors.Is(err, ErrConflict):
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"code": "CONFLICT", "message": err.Error()}})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}})
	}
}
```

## Config from environment

```go
// internal/config/config.go
package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	DatabaseURL string
	Port        int
	JWTSecret   string
	Env         string
}

func Load() (*Config, error) {
	dbURL, ok := os.LookupEnv("DATABASE_URL")
	if !ok || dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	jwtSecret, ok := os.LookupEnv("JWT_SECRET")
	if !ok || jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}
	port := 3000
	if s := os.Getenv("PORT"); s != "" {
		p, err := strconv.Atoi(s)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT: %w", err)
		}
		port = p
	}
	return &Config{DatabaseURL: dbURL, Port: port, JWTSecret: jwtSecret, Env: os.Getenv("APP_ENV")}, nil
}
```

## Interface-driven service design

```go
// internal/users/service.go
package users

import "context"

// Define the interface in the consumer (handler) package, not in users
type Repository interface {
	FindByID(ctx context.Context, id int64) (*User, error)
	Create(ctx context.Context, req CreateUserRequest) (*User, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetByID(ctx context.Context, id int64) (*User, error) {
	return s.repo.FindByID(ctx, id)
}
```

## One-at-a-time rule

Add one handler file or one domain package per PR.

## Guardrails

- **pn-backend-philosophy** — security, OWASP, REST, secrets rulebook.
- **pn-go-backend** — rule for file-glob activation and Go-specific style.
