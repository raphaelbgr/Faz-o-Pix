/**
 * Barrel exports for shared types
 * Centralizes all type exports for easy importing across the monorepo
 */

// Re-export all types from common module
export * from './common';

// Re-export all types from api module  
export * from './api';

// Create convenient grouped exports for better developer experience
export type {
  // Health check types
  HealthStatus,
  ServiceCheck,
  DetailedHealthStatus,
  
  // API types
  ApiResponse,
  ApiError,
  PaginatedResponse,
  
  // Authentication types
  User,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  
  // Environment types
  Environment,
  EnvironmentConfig,
  
  // Validation types
  ValidationError,
  ValidationResult,
  PixKeyValidation,
  CpfValidation,
  CnpjValidation,
  PhoneValidation,
  
  // Utility types
  Nullable,
  Optional,
  Awaitable,
  TimestampFields,
  SoftDeleteFields,
  AuditFields,
  
  // Logging types
  LogLevel,
  LogContext,
  StructuredLogEntry,
  
  // WebSocket types
  WebSocketMessage,
  WebSocketError,
  
  // Configuration types
  DatabaseConfig,
  SecurityConfig,
  ServerConfig,
} from './common';

export type {
  // Bill types
  Bill,
  BillParticipant,
  Expense,
  ExpenseSplit,
  Settlement,
  Balance,
  
  // Request types
  CreateBillRequest,
  UpdateBillRequest,
  AddParticipantRequest,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  CreateSettlementRequest,
  UpdateSettlementRequest,
  
  // Response types
  BillsResponse,
  BillResponse,
  ExpenseResponse,
  SettlementResponse,
  BalancesResponse,
  
  // Authentication API types
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  
  // User API types
  UpdateUserRequest,
  UserPreferences,
  UpdatePreferencesRequest,
  UserResponse,
  PreferencesResponse,
  
  // Validation API types
  ValidatePixKeyRequest,
  ValidateCpfRequest,
  ValidateCnpjRequest,
  ValidatePhoneRequest,
  PixKeyValidationResponse,
  CpfValidationResponse,
  CnpjValidationResponse,
  PhoneValidationResponse,
  
  // WebSocket message types
  BillUpdateMessage,
  ExpenseCreatedMessage,
  ExpenseUpdatedMessage,
  ParticipantJoinedMessage,
  SettlementCreatedMessage,
  BalanceUpdatedMessage,
  WebSocketBillMessage,
  
  // Error types
  ApiValidationError,
  ApiNotFoundError,
  ApiUnauthorizedError,
  ApiForbiddenError,
  ApiInternalError,
  
  // Filter and sort types
  BillFilters,
  BillSort,
  ExpenseFilters,
  ExpenseSort,
  
  // Export types
  BillExportRequest,
  BillExportResponse,
} from './api';