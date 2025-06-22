# Configuração de Desenvolvimento

Este projeto está configurado com **Nodemon** e **Sucrase** para um desenvolvimento mais rápido e eficiente.

## 🚀 Scripts Disponíveis

### Desenvolvimento
```bash
# Desenvolvimento normal
npm run dev

# Desenvolvimento com debug
npm run dev:debug

# Desenvolvimento com verbose
npm run dev:verbose

# Desenvolvimento com debug (configuração alternativa)
nodemon --config nodemon.dev.json
```

### Build
```bash
# Build com TypeScript
npm run build

# Build com Sucrase (mais rápido)
npm run build:dev

# Build com Sucrase em modo watch
npm run build:watch
```

### Testes e Exemplos
```bash
# Testar conexão com banco
npm run test:db

# Conectar ao banco
npm run db:connect

# Executar exemplo do service de usuário
npm run example:user

# Executar exemplo do servidor
npm run example:server
```

## ⚙️ Configurações

### Nodemon (`nodemon.json`)
- **Watch**: Monitora a pasta `src`
- **Extensões**: `.ts`, `.js`, `.json`
- **Execução**: Usa `sucrase-node` para transpilação
- **Delay**: 1 segundo entre reinicializações
- **Eventos**: Mensagens coloridas para restart/crash/exit

### Sucrase (`sucrase.config.js`)
- **Transforms**: TypeScript e imports ES6
- **JSX**: Configurado para React (se necessário)
- **Produção**: Detecta automaticamente o ambiente

### Arquivos Ignorados
- Arquivos de teste (`.spec.ts`, `.test.ts`)
- `node_modules`, `dist`, `coverage`
- Logs e arquivos temporários

## 🔧 Vantagens do Sucrase

1. **Velocidade**: 20-100x mais rápido que o TypeScript compiler
2. **Simplicidade**: Configuração mínima
3. **Compatibilidade**: Suporte completo a ES6+ e TypeScript
4. **Desenvolvimento**: Hot reload instantâneo

## 🐛 Debug

Para debugar o aplicativo:

1. Use `npm run dev:debug` ou `nodemon --config nodemon.dev.json`
2. Abra o Chrome DevTools
3. Vá para `chrome://inspect`
4. Clique em "Open dedicated DevTools for Node"

## 📝 Notas

- O Sucrase é usado apenas em desenvolvimento
- Para produção, use `npm run build` (TypeScript compiler)
- O Nodemon reinicia automaticamente quando detecta mudanças
- Use `rs` no terminal para reiniciar manualmente 