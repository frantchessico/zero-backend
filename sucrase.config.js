module.exports = {
  transforms: ['typescript', 'imports'],
  jsxPragma: 'React.createElement',
  jsxFragmentPragma: 'React.Fragment',
  enableLegacyTypeScriptModuleInterop: false,
  enableLegacyBabel5ModuleInterop: false,
  production: process.env.NODE_ENV === 'production',
  filePath: process.argv[2] || 'src/index.ts'
}; 