---
name: pn-rust-scaffolding
description: Scaffolds new Rust API projects (Axum, Actix-web) or handlers. Use when setting up a Rust backend; covers Cargo workspace layout, Axum/Actix patterns, error handling, and idiomatic Rust conventions.
---

# Rust backend scaffolding

## When to use

- Starting a new Rust API project with Axum or Actix-web.
- Adding a new route module or domain handler.
- Setting up a Cargo workspace for multiple crates.

## Project structure

```
# Single binary — Axum
src/
  main.rs             # Entry point: build router, start server
  routes/
    mod.rs            # Collect and export all route modules
    users.rs          # User route handlers
    orders.rs
  services/
    mod.rs
    users.rs          # Business logic
  db/
    mod.rs
    pool.rs           # sqlx pool setup
  models/
    user.rs           # Serde/sqlx types
  errors.rs           # AppError enum + IntoResponse impl
  config.rs           # Typed config from environment

Cargo.toml
.env.example
```

For larger projects: Cargo workspace with separate crates (`api`, `domain`, `infrastructure`).

## Axum scaffold

```rust
// src/errors.rs
use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Not found")]
    NotFound,
    #[error("Forbidden")]
    Forbidden,
    #[error("Validation failed: {0}")]
    Validation(String),
    #[error("Database error: {0}")]
    Db(#[from] sqlx::Error),
    #[error("Internal error")]
    Internal,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = match &self {
            AppError::NotFound    => (StatusCode::NOT_FOUND, "NOT_FOUND"),
            AppError::Forbidden   => (StatusCode::FORBIDDEN, "FORBIDDEN"),
            AppError::Validation(_) => (StatusCode::UNPROCESSABLE_ENTITY, "VALIDATION_FAILED"),
            AppError::Db(_)       => (StatusCode::INTERNAL_SERVER_ERROR, "DB_ERROR"),
            AppError::Internal    => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"),
        };
        let body = json!({ "error": { "code": code, "message": self.to_string() } });
        (status, Json(body)).into_response()
    }
}
```

```rust
// src/routes/users.rs
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::{errors::AppError, AppState};

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub name: String,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: i64,
    pub email: String,
    pub name: String,
}

pub async fn create_user(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    let user = state.user_service.create(&body).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({ "data": user }))))
}

pub async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user = state.user_service.find_by_id(id).await?;
    Ok(Json(serde_json::json!({ "data": user })))
}
```

```rust
// src/main.rs
use axum::{Router, routing::{get, post}};
use std::{net::SocketAddr, sync::Arc};
use tokio::net::TcpListener;

mod config; mod db; mod errors; mod routes; mod services; mod models;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub user_service: Arc<services::users::UserService>,
}

#[tokio::main]
async fn main() {
    let cfg = config::Config::from_env().expect("Config failed");
    let pool = db::pool::create_pool(&cfg.database_url).await.expect("DB pool failed");
    let state = Arc::new(AppState {
        db: pool.clone(),
        user_service: Arc::new(services::users::UserService::new(pool)),
    });
    let app = Router::new()
        .route("/api/v1/users", post(routes::users::create_user))
        .route("/api/v1/users/:id", get(routes::users::get_user))
        .with_state(state);
    let addr = SocketAddr::from(([0, 0, 0, 0], cfg.port));
    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## Config from environment

```rust
// src/config.rs
use std::env;

pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            database_url: env::var("DATABASE_URL").map_err(|_| "DATABASE_URL required")?,
            jwt_secret: env::var("JWT_SECRET").map_err(|_| "JWT_SECRET required")?,
            port: env::var("PORT").unwrap_or_else(|_| "3000".to_string())
                .parse().map_err(|_| "Invalid PORT")?,
        })
    }
}
```

## Cargo.toml essentials

```toml
[package]
name = "my-api"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = { version = "0.7", features = ["json"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.8", features = ["postgres", "runtime-tokio", "chrono", "uuid"] }
thiserror = "1"
dotenvy = "0.15"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```

## One-at-a-time rule

Add one route module or one service per PR. Avoid refactoring shared types and adding features in the same diff.

## Guardrails

- **pn-backend-philosophy** — security, OWASP, REST, secrets rulebook.
- **pn-rust-backend** — rule for file-glob activation and Rust-specific style.
