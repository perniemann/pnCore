---
name: pn-ruby-scaffolding
description: "Scaffolds new Ruby API projects (Rails API-only, Sinatra) or routes. Use when adding a new controller/service; covers Rails conventions, Gemfile hygiene, service objects, and idiomatic Ruby patterns."
---

# Ruby backend scaffolding

## When to use

- Starting a new Ruby API project (Rails `--api` or Sinatra).
- Adding a new controller, route, or domain service.
- Establishing service object and error handling patterns.

## Rails API-only scaffold

```bash
# Create API-only Rails app
rails new my-api --api --database=postgresql
# Omit default Rails test framework only if you use an external test stack (see Rails docs)
cd my-api

# Gemfile essentials
bundle add rack-cors       # CORS
bundle add devise          # auth (optional)
bundle add kaminari        # pagination
bundle add rswag           # OpenAPI docs
bundle add standardrb --group development  # linting
```

## Project structure

```
app/
  controllers/
    api/
      v1/
        users_controller.rb     # Thin: validate, call service, render
        application_controller.rb
  services/
    users/
      create_user.rb            # Plain Ruby: one public #call method
      find_user.rb
  serializers/
    user_serializer.rb          # Output shaping (blueprinter or JSONAPI)
  models/
    user.rb                     # ActiveRecord model: validations, scopes, associations
config/
  routes.rb
```

## Controller scaffold

```ruby
# app/controllers/api/v1/users_controller.rb
# frozen_string_literal: true

module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_user!
      before_action :set_user, only: [:show, :update, :destroy]

      def index
        users = User.active.page(params[:page]).per(params[:per_page] || 20)
        render json: { data: UserSerializer.render(users) }
      end

      def show
        render json: { data: UserSerializer.render(@user) }
      end

      def create
        result = Users::CreateUser.new(user_params, current_user).call
        if result.success?
          render json: { data: UserSerializer.render(result.user) }, status: :created
        else
          render json: { error: { code: "VALIDATION_FAILED", message: result.errors.full_messages.join(", ") } },
                 status: :unprocessable_entity
        end
      end

      private

      def set_user
        @user = User.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "User not found" } }, status: :not_found
      end

      def user_params
        params.require(:user).permit(:email, :name, :role)
      end
    end
  end
end
```

## Service object scaffold

```ruby
# app/services/users/create_user.rb
# frozen_string_literal: true

module Users
  class CreateUser
    Result = Struct.new(:success?, :user, :errors)

    def initialize(params, requester)
      @params = params
      @requester = requester
    end

    def call
      user = User.new(@params)
      if user.save
        UserMailer.welcome(user).deliver_later
        Result.new(true, user, nil)
      else
        Result.new(false, nil, user.errors)
      end
    end
  end
end
```

## ApplicationController

```ruby
# app/controllers/api/v1/application_controller.rb
# frozen_string_literal: true

module Api
  module V1
    class ApplicationController < ActionController::API
      rescue_from ActiveRecord::RecordNotFound do |e|
        render json: { error: { code: "NOT_FOUND", message: e.message } }, status: :not_found
      end

      rescue_from ActionController::ParameterMissing do |e|
        render json: { error: { code: "BAD_REQUEST", message: e.message } }, status: :bad_request
      end

      private

      def authenticate_user!
        token = request.headers["Authorization"]&.split(" ")&.last
        @current_user = AuthService.decode(token)
        render json: { error: { code: "UNAUTHORIZED", message: "Invalid token" } }, status: :unauthorized unless @current_user
      end

      def current_user = @current_user
    end
  end
end
```

## Secrets and config

```ruby
# Use Rails credentials for secrets (encrypted)
# EDITOR=vim rails credentials:edit

# Or use environment variables via dotenv-rails in development
# Gemfile: gem "dotenv-rails", groups: [:development, :test]

# Access in code
stripe_key = Rails.application.credentials.stripe[:secret_key]
# OR
stripe_key = ENV.fetch("STRIPE_SECRET_KEY") { raise "STRIPE_SECRET_KEY required" }
```

## N+1 prevention

```ruby
# app/controllers/api/v1/orders_controller.rb
def index
  # BAD: loads associations one-by-one
  @orders = Order.all  # then view accesses order.user.name for each

  # GOOD: eager load associations used in serialization
  @orders = Order.includes(:user, :line_items).page(params[:page])
end
```

## One-at-a-time rule

Add one controller action or one service object per PR.

## Guardrails

- **pn-backend-philosophy** — security, OWASP, REST, secrets rulebook.
- **pn-ruby-backend** — rule for file-glob activation and Ruby-specific style.
