---
name: pn-php-scaffolding
description: "Scaffolds new PHP API projects (Laravel, Slim) or routes. Use when adding a new controller/service; covers PSR standards, Composer hygiene, Laravel conventions, and idiomatic PHP 8.x patterns."
---

# PHP backend scaffolding

## When to use

- Starting a new PHP API project (Laravel API or Slim Framework).
- Adding a new controller, route, or domain service.
- Establishing typed, modern PHP patterns from scratch.

## Laravel API scaffold

```bash
# New Laravel API project
composer create-project laravel/laravel my-api
cd my-api

# Install common packages
composer require spatie/laravel-permission   # RBAC
composer require tymon/jwt-auth              # JWT auth
composer require spatie/laravel-query-builder # filterable queries
composer require --dev squizlabs/php_codesniffer  # linting
```

## Project structure

```
app/
  Http/
    Controllers/
      Api/
        V1/
          UserController.php     # Thin: validate, delegate, respond
          Controller.php
    Requests/
      CreateUserRequest.php      # Form Request validation
      UpdateUserRequest.php
    Resources/
      UserResource.php           # API resource (output shaping)
      UserCollection.php
  Services/
    UserService.php              # Business logic
  Repositories/
    UserRepository.php           # DB queries (optional layer)
  Models/
    User.php
routes/
  api.php                        # Route definitions
config/
  services.php                   # Third-party service keys (never raw env())
```

## Controller scaffold

```php
<?php
// app/Http/Controllers/Api/V1/UserController.php
declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateUserRequest;
use App\Http\Resources\UserResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private readonly UserService $userService) {}

    public function index(Request $request): JsonResponse
    {
        $users = $this->userService->list(
            page: (int) $request->query('page', 1),
            perPage: (int) $request->query('per_page', 20),
        );
        return response()->json(['data' => UserResource::collection($users)]);
    }

    public function store(CreateUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated());
        return response()->json(['data' => new UserResource($user)], 201);
    }

    public function show(int $id): JsonResponse
    {
        $user = $this->userService->findOrFail($id);
        return response()->json(['data' => new UserResource($user)]);
    }
}
```

## Form Request validation

```php
<?php
// app/Http/Requests/CreateUserRequest.php
declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // or: return $this->user()?->can('create-users');
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'name'  => ['required', 'string', 'min:1', 'max:100'],
            'role'  => ['sometimes', 'string', 'in:user,admin'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'An account with this email already exists.',
        ];
    }
}
```

## Service layer

```php
<?php
// app/Services/UserService.php
declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class UserService
{
    public function list(int $page, int $perPage): LengthAwarePaginator
    {
        return User::active()
            ->orderBy('created_at', 'desc')
            ->paginate(perPage: $perPage, page: $page);
    }

    public function create(array $validated): User
    {
        $user = User::create([
            'email' => $validated['email'],
            'name'  => $validated['name'],
            'role'  => $validated['role'] ?? 'user',
        ]);
        // Side effects belong here, not in model callbacks
        // SendWelcomeEmail::dispatch($user);
        return $user;
    }

    public function findOrFail(int $id): User
    {
        return User::findOrFail($id); // throws ModelNotFoundException → 404 via handler
    }
}
```

## Secrets and config

```php
// GOOD: reference via config helper (works after config:cache)
$stripeKey = config('services.stripe.secret');

// BAD: env() does not work after php artisan config:cache
$stripeKey = env('STRIPE_SECRET_KEY'); // returns null in production

// config/services.php
return [
    'stripe' => [
        'secret' => env('STRIPE_SECRET_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],
];
```

## API Resource output shaping

```php
<?php
// app/Http/Resources/UserResource.php
declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'email'      => $this->email,
            'name'       => $this->name,
            'role'       => $this->role,
            'created_at' => $this->created_at->toISOString(),
            // Never include: password, remember_token, or internal fields
        ];
    }
}
```

## Routes

```php
// routes/api.php
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::apiResource('users', UserController::class);
});
```

## One-at-a-time rule

Add one controller + Form Request + Resource per PR.

## Guardrails

- **pn-backend-philosophy** — security, OWASP, REST, secrets rulebook.
- **pn-php-backend** — rule for file-glob activation and PHP-specific style.
