#!/bin/bash
# Script para configurar ambiente PocketBase isolado para testes de homologação
set -e

PB_VERSION="0.22.10"
PB_DIR="/tmp/pocketbase-test-$$"
PB_DATA="$PB_DIR/data"
PB_PORT=8090

echo "🚀 Configurando ambiente PocketBase isolado para homologação..."

# 1. Criar diretório temporário
mkdir -p "$PB_DATA"

# 2. Baixar PocketBase se não existir
if ! command -v pocketbase &> /dev/null; then
 echo "📦 Baixando PocketBase v$PB_VERSION..."
 curl -L "https://github.com/pocketbase/pocketbase/releases/download/v$PB_VERSION/pocketbase_${PB_VERSION}_linux_amd64.zip" -o "$PB_DIR/pocketbase.zip"
 unzip "$PB_DIR/pocketbase.zip" -d "$PB_DIR"
 chmod +x "$PB_DIR/pocketbase"
 PB_BIN="$PB_DIR/pocketbase"
else
 PB_BIN=$(which pocketbase)
fi

# 3. Copiar migrações e hooks do projeto
cp -r pocketbase/migrations "$PB_DIR/"
cp -r pocketbase/hooks "$PB_DIR/"

# 4. Iniciar PocketBase em background
echo "🔄 Iniciando PocketBase na porta $PB_PORT..."
"$PB_BIN" serve --http="0.0.0.0:$PB_PORT" --dir="$PB_DIR" &
PB_PID=$!

echo "✅ PocketBase iniciado (PID: $PB_PID)"
echo "💡 URL: http://localhost:$PB_PORT"
echo "⏳ Aguardando inicialização completa..."
sleep 3

# 5. Salvar PID para cleanup posterior
echo "$PB_PID" > "$PB_DIR/pb.pid"

echo "🎯 Ambiente pronto! Execute os testes com: pnpm test:homologation"
echo "🛑 Para parar: kill $PB_PID"