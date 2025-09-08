/**
 * Common TypeScript types shared across the Faz-o-Pix monorepo
 * These types ensure consistency between frontend and backend
 */

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
  };
  version: string;
  uptime: number;
}

export interface ServiceCheck {
  name: string;
  status: 'connected' | 'disconnected';
  responseTime: number;
  error?: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  services: ServiceCheck[];
  system: {
    nodeVersion: string;
    platform: string;
    architecture: string;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  cnpj?: string;
  pixKey?: string;
  isPlaceholder: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  identifier: string; // email, phone, cpf, or cnpj
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  cnpj?: string;
  pixKey?: string;
  password: string;
}

// =============================================================================
// ENVIRONMENT TYPES
// =============================================================================

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  NODE_ENV: Environment;
  DATABASE_URL: string;
  JWT_SECRET: string;
  COOKIE_SECRET: string;
  ENCRYPTION_KEY: string;
  PORT: number;
  HOST: string;
  CORS_ORIGIN: string;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

// =============================================================================
// PIX VALIDATION TYPES (BRAZILIAN SPECIFIC)
// =============================================================================

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface PixKeyValidation {
  isValid: boolean;
  type: PixKeyType | null;
  formatted: string;
  errors: string[];
}

export interface CpfValidation {
  isValid: boolean;
  formatted: string;
  errors: string[];
}

export interface CnpjValidation {
  isValid: boolean;
  formatted: string;
  errors: string[];
}

export interface PhoneValidation {
  isValid: boolean;
  formatted: string; // E.164 format
  country: string;
  errors: string[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Awaitable<T> = T | Promise<T>;

export interface TimestampFields {
  createdAt: string;
  updatedAt: string;
}

export interface SoftDeleteFields {
  deletedAt: string | null;
  isDeleted: boolean;
}

export interface AuditFields extends TimestampFields {
  createdBy: string;
  updatedBy: string;
}

// =============================================================================
// LOGGING TYPES
// =============================================================================

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogContext {
  requestId?: string;
  userId?: string;
  billId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

export interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

// =============================================================================
// WEBSOCKET TYPES
// =============================================================================

export interface WebSocketMessage<T = any> {
  type: string;
  payload: T;
  timestamp: string;
  requestId?: string;
}

export interface WebSocketError {
  type: 'error';
  payload: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface DatabaseConfig {
  url: string;
  connectionTimeout: number;
  queryTimeout: number;
  maxConnections?: number;
}


export interface SecurityConfig {
  jwtSecret: string;
  cookieSecret: string;
  encryptionKey: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
}

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigin: string;
  rateLimitMax: number;
  rateLimitWindow: number;
  requestTimeout: number;
}