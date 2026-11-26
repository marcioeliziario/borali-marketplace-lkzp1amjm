#!/bin/bash
# Script para configurar ambiente de homologação local do Borali
set -e

echo "🚀 Configurando ambiente de homologação Borali..."

# 1. Verificar se pnpm está instalado
if ! command -v pnpm &> /dev/null; then
 echo "❌ pnpm não encontrado. Instale com: npm install -g pnpm"
 exit 1
fi

# 2. Instalar dependências
echo "📦 Instalando dependências..."
pnpm install --frozen-lockfile

# 3. Limpar build anterior
echo "🧹 Limpando builds anteriores..."
rm -rf dist/

# 4. Executar build de produção
echo "🏗️  Executando build de produção..."
pnpm build

echo "✅ Ambiente de homologação configurado com sucesso!"
echo "💡 Para iniciar o servidor de desenvolvimento: pnpm dev"