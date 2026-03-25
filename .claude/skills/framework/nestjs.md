# Skill: NestJS Patterns

**Used by:** Backend NestJS agent, Code Reviewer.

---

## Module Structure

```
src/
  app.module.ts              # Root module — imports feature modules
  users/
    users.module.ts          # Feature module
    users.controller.ts      # Route handlers only — no business logic
    users.service.ts         # Business logic
    users.repository.ts      # DB queries (optional — use if complex)
    dto/
      create-user.dto.ts
      update-user.dto.ts
    entities/
      user.entity.ts
    users.controller.spec.ts
    users.service.spec.ts
```

**Rule:** Never put business logic in controllers. Controllers only: validate input (via pipes), call service, return result.

---

## Controller Pattern

```typescript
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<DataResponse<UserResponse>> {
    const user = await this.usersService.create(dto);
    return { success: true, data: user };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DataResponse<UserResponse>> {
    const user = await this.usersService.findOneOrFail(id);
    return { success: true, data: user };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @GetUser() currentUser: User,
  ): Promise<DataResponse<UserResponse>> {
    const user = await this.usersService.update(id, dto, currentUser);
    return { success: true, data: user };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
```

---

## Service Pattern

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const existing = await this.repo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const user = this.repo.create(dto);
    await this.repo.save(user);
    return this.toResponse(user);
  }

  async findOneOrFail(id: string): Promise<UserResponse> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.toResponse(user);
  }

  private toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
```

---

## Guards

```typescript
// JWT guard — attach to controller class or individual routes
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// Role guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// Usage
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete(':id')
async remove() { ... }
```

---

## Pipes

```typescript
// Global validation pipe — set in main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,          // strip unknown fields
  forbidNonWhitelisted: true,
  transform: true,          // auto-convert types (string '5' → number 5)
  transformOptions: { enableImplicitConversion: true },
}));

// ParseUUIDPipe on params
@Get(':id')
async findOne(@Param('id', ParseUUIDPipe) id: string) { ... }
```

---

## Exception Filters (Global)

```typescript
// Catch all unhandled errors and return consistent envelope
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      response.status(status).json({
        success: false,
        error: {
          code: this.toErrorCode(status),
          message: typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message,
        },
      });
    } else {
      response.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    }
  }

  private toErrorCode(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN',
      404: 'NOT_FOUND', 409: 'ALREADY_EXISTS', 422: 'UNPROCESSABLE',
    };
    return map[status] ?? 'INTERNAL_ERROR';
  }
}
```

---

## Interceptors

```typescript
// Transform all responses to snake_case (if needed)
// Log request duration
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        const req = context.switchToHttp().getRequest();
        console.log(`${req.method} ${req.url} ${ms}ms`);
      }),
    );
  }
}
```

---

## Module Setup

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## Code Review: NestJS Checklist

```
[ ] No business logic in controllers
[ ] ValidationPipe with whitelist: true applied globally
[ ] ParseUUIDPipe on all UUID params
[ ] JwtAuthGuard on all protected routes
[ ] Resource ownership verified in service (not just auth)
[ ] toResponse() mapper — raw entity not returned
[ ] Global exception filter returns consistent error envelope
[ ] No circular module dependencies
```
