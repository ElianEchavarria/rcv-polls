// Jest setup for backend tests
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/ttp_winter_test";

