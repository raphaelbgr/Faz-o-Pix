/**
 * API-specific types for the Faz-o-Pix application
 * These types define the contract between frontend and backend
 */

import { ApiResponse, PaginatedResponse, ValidationError } from './common';

// =============================================================================
// BILL MANAGEMENT TYPES
// =============================================================================

export interface Bill {
  id: string;
  name: string;
  description?: string;
  currency: 'BRL';
  simplifyDebts: boolean;
  isSettled: boolean;
  createdBy: string;
  participants: BillParticipant[];
  expenses: Expense[];
  settlements: Settlement[];
  balances: Balance[];
  createdAt: string;
  updatedAt: string;
}

export interface BillParticipant {
  id: string;
  billId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    pixKey?: string;
    isPlaceholder: boolean;
  };
  joinedAt: string;
  leftAt?: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  billId: string;
  paidBy: string;
  amount: number;
  description: string;
  category?: string;
  date: string;
  splits: ExpenseSplit[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  participantId: string;
  amount: number;
  percentage?: number;
  shares?: number;
  splitType: 'equal' | 'percentage' | 'shares' | 'exact';
}

export interface Settlement {
  id: string;
  billId: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  pixTransactionId?: string;
  status: 'pending' | 'completed' | 'cancelled';
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Balance {
  participantId: string;
  participantName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // positive = owed money, negative = owes money
  settlements: {
    toPay: Array<{
      toParticipantId: string;
      toParticipantName: string;
      amount: number;
    }>;
    toReceive: Array<{
      fromParticipantId: string;
      fromParticipantName: string;
      amount: number;
    }>;
  };
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

// Bill API
export interface CreateBillRequest {
  name: string;
  description?: string;
  simplifyDebts?: boolean;
}

export interface UpdateBillRequest {
  name?: string;
  description?: string;
  simplifyDebts?: boolean;
}

export interface AddParticipantRequest {
  pixKey?: string;
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
}

// Expense API
export interface CreateExpenseRequest {
  paidBy: string;
  amount: number;
  description: string;
  category?: string;
  date?: string;
  splits: Array<{
    participantId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
    splitType: 'equal' | 'percentage' | 'shares' | 'exact';
  }>;
}

export interface UpdateExpenseRequest {
  paidBy?: string;
  amount?: number;
  description?: string;
  category?: string;
  date?: string;
  splits?: Array<{
    participantId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
    splitType: 'equal' | 'percentage' | 'shares' | 'exact';
  }>;
}

// Settlement API
export interface CreateSettlementRequest {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  pixTransactionId?: string;
}

export interface UpdateSettlementRequest {
  status: 'completed' | 'cancelled';
  pixTransactionId?: string;
  settledAt?: string;
}

// API Response Types
export type BillsResponse = ApiResponse<PaginatedResponse<Bill>>;
export type BillResponse = ApiResponse<Bill>;
export type ExpenseResponse = ApiResponse<Expense>;
export type SettlementResponse = ApiResponse<Settlement>;
export type BalancesResponse = ApiResponse<Balance[]>;

// =============================================================================
// AUTHENTICATION API TYPES
// =============================================================================

export interface LoginRequest {
  identifier: string; // email, phone, cpf, or cnpj
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  cnpj?: string;
  pixKey?: string;
  password: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  identifier: string; // email, phone, cpf, or cnpj
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// Authentication Response Types
export type LoginResponse = ApiResponse<{
  user: User;
  tokens: AuthTokens;
}>;

export type RegisterResponse = ApiResponse<{
  user: User;
  tokens: AuthTokens;
}>;

export type RefreshTokenResponse = ApiResponse<{
  tokens: AuthTokens;
}>;

// =============================================================================
// USER API TYPES
// =============================================================================

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  pixKey?: string;
}

export interface UserPreferences {
  language: 'pt-BR';
  currency: 'BRL';
  timezone: 'America/Sao_Paulo';
  notifications: {
    email: boolean;
    push: boolean;
    billUpdates: boolean;
    settlements: boolean;
  };
}

export interface UpdatePreferencesRequest {
  preferences: Partial<UserPreferences>;
}

// User Response Types
export type UserResponse = ApiResponse<User>;
export type PreferencesResponse = ApiResponse<UserPreferences>;

// =============================================================================
// VALIDATION API TYPES
// =============================================================================

export interface ValidatePixKeyRequest {
  pixKey: string;
}

export interface ValidateCpfRequest {
  cpf: string;
}

export interface ValidateCnpjRequest {
  cnpj: string;
}

export interface ValidatePhoneRequest {
  phone: string;
}

export interface PixKeyValidationResponse {
  isValid: boolean;
  type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null;
  formatted: string;
  errors: string[];
}

export interface CpfValidationResponse {
  isValid: boolean;
  formatted: string;
  errors: string[];
}

export interface CnpjValidationResponse {
  isValid: boolean;
  formatted: string;
  errors: string[];
}

export interface PhoneValidationResponse {
  isValid: boolean;
  formatted: string;
  country: string;
  errors: string[];
}

// =============================================================================
// WEBSOCKET API TYPES
// =============================================================================

export interface BillUpdateMessage {
  type: 'bill:updated';
  payload: {
    billId: string;
    bill: Bill;
    changes: string[];
    updatedBy: string;
  };
}

export interface ExpenseCreatedMessage {
  type: 'expense:created';
  payload: {
    billId: string;
    expense: Expense;
    createdBy: string;
  };
}

export interface ExpenseUpdatedMessage {
  type: 'expense:updated';
  payload: {
    billId: string;
    expense: Expense;
    changes: string[];
    updatedBy: string;
  };
}

export interface ParticipantJoinedMessage {
  type: 'participant:joined';
  payload: {
    billId: string;
    participant: BillParticipant;
  };
}

export interface SettlementCreatedMessage {
  type: 'settlement:created';
  payload: {
    billId: string;
    settlement: Settlement;
    createdBy: string;
  };
}

export interface BalanceUpdatedMessage {
  type: 'balance:updated';
  payload: {
    billId: string;
    balances: Balance[];
  };
}

export type WebSocketBillMessage = 
  | BillUpdateMessage
  | ExpenseCreatedMessage
  | ExpenseUpdatedMessage
  | ParticipantJoinedMessage
  | SettlementCreatedMessage
  | BalanceUpdatedMessage;

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ApiValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  details: ValidationError[];
  statusCode: 400;
}

export interface ApiNotFoundError {
  code: 'NOT_FOUND';
  message: string;
  statusCode: 404;
}

export interface ApiUnauthorizedError {
  code: 'UNAUTHORIZED';
  message: string;
  statusCode: 401;
}

export interface ApiForbiddenError {
  code: 'FORBIDDEN';
  message: string;
  statusCode: 403;
}

export interface ApiInternalError {
  code: 'INTERNAL_ERROR';
  message: string;
  statusCode: 500;
}

// =============================================================================
// FILTER AND SORT TYPES
// =============================================================================

export interface BillFilters {
  name?: string;
  isSettled?: boolean;
  createdBy?: string;
  participantId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface BillSort {
  field: 'name' | 'createdAt' | 'updatedAt' | 'totalAmount';
  direction: 'asc' | 'desc';
}

export interface ExpenseFilters {
  description?: string;
  category?: string;
  paidBy?: string;
  amountFrom?: number;
  amountTo?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExpenseSort {
  field: 'description' | 'amount' | 'date' | 'createdAt';
  direction: 'asc' | 'desc';
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export interface BillExportRequest {
  billId: string;
  format: 'pdf' | 'excel' | 'csv';
  includeSettlements?: boolean;
  includeParticipants?: boolean;
}

export interface BillExportResponse extends ApiResponse<{
  downloadUrl: string;
  filename: string;
  expiresAt: string;
}> {}