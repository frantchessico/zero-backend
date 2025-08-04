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
    '^.+\\.ts$': 'ts-jest'
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
  
  // Timeout para testes
  testTimeout: 10000,
  
  // Verbose para debug
  verbose: true,
  
  // Configurações específicas para diferentes tipos de teste
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.ts'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/tests/**',
        '!src/examples/**'
      ]
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.integration.ts']
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/src/tests/e2e/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.e2e.ts']
    }
  ]
}; 