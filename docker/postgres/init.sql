-- PostgreSQL initialization script for Faz-o-Pix development
-- This script runs automatically when the container starts for the first time

-- Ensure UTF-8 encoding and proper collation for Brazilian Portuguese
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create development database if it doesn't exist
-- (This is handled by POSTGRES_DB environment variable, but kept for reference)
-- CREATE DATABASE fazopix_dev WITH ENCODING 'UTF8' LC_COLLATE='pt_BR.UTF-8' LC_CTYPE='pt_BR.UTF-8';

-- Set timezone for Brazilian operations
SET timezone = 'America/Sao_Paulo';

-- Create a custom schema for application-specific functions if needed
-- CREATE SCHEMA IF NOT EXISTS fazopix;

-- Log initialization completion
DO $$
BEGIN
    RAISE NOTICE 'Faz-o-Pix PostgreSQL initialization completed successfully';
END $$;