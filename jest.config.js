module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',
  
  // Extensões de arquivo para testar
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/tests/**/*.test.ts',
    '**/*.test.ts'
  ],
  
  // Transformações
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      diagnostics: false,
    }]
  },
  
  // Extensões de módulo
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Cobertura de código
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/examples/**'
  ],
  
  // Relatórios de cobertura
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Limpeza automática
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Setup e teardown
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  moduleNameMapper: {
    '^@paymentsds/mpesa$': '<rootDir>/src/tests/mocks/mpesa.ts'
  },
  testPathIgnorePatterns: ['<rootDir>/src/config/database.test.ts'],
  
  // Timeout para testes
  testTimeout: 10000,
  
  // Verbose para debug
  verbose: true,
};
