#!/bin/bash
# Script para configurar ambiente PocketBase isolado para testes de homologação
# Compatível com macOS Intel, Apple Silicon e Linux
set -e

PB_VERSION="0.22.10"
PB_DIR="/tmp/pocketbase-test-$$"
PB_DATA="$PB_DIR/data"
PB_PORT=8090
PB_HOST="127.0.0.1"

echo " Configurando ambiente PocketBase isolado para homologação..."

# Detectar arquitetura do sistema
ARCH=$(uname -m)
OS=$(uname -s)

if [ "$OS" = "Darwin" ]; then
 if [ "$ARCH" = "arm64" ]; then
 PB_ARCH="darwin_arm64"
 else
 PB_ARCH="darwin_amd64"
 fi
else
 PB_ARCH="linux_amd64"
fi

echo " Arquitetura detectada: $OS $ARCH -> $PB_ARCH"

# 1. Criar diretório temporário
mkdir -p "$PB_DATA"

# 2. Baixar PocketBase se não existir localmente
PB_BIN="$PB_DIR/pocketbase"
if [ ! -f "$PB_BIN" ]; then
 echo " Baixando PocketBase v$PB_VERSION para $PB_ARCH..."
 curl -L "https://github.com/pocketbase/pocketbase/releases/download/v$PB_VERSION/pocketbase_${PB_VERSION}_${PB_ARCH}.zip" -o "$PB_DIR/pocketbase.zip"
 unzip -o "$PB_DIR/pocketbase.zip" -d "$PB_DIR"
 chmod +x "$PB_BIN"
fi

# 3. Copiar migrações e hooks do projeto
cp -r pocketbase/migrations "$PB_DIR/"
cp -r pocketbase/hooks "$PB_DIR/"

# 4. Função de cleanup
cleanup() {
 echo " Parando PocketBase (PID: $PB_PID)..."
 kill "$PB_PID" 2>/dev/null || true
 rm -rf "$PB_DIR"
 echo "✅ Ambiente limpo."
}
trap cleanup EXIT

# 5. Iniciar PocketBase restrito a 127.0.0.1
echo " Iniciando PocketBase em http://$PB_HOST:$PB_PORT ..."
"$PB_BIN" serve --http="$PB_HOST:$PB_PORT" --dir="$PB_DIR" &
PB_PID=$!

# 6. Aguardar disponibilidade
echo "⏳ Aguardando PocketBase ficar disponível..."
for i in $(seq 1 30); do
 if curl -s "http://$PB_HOST:$PB_PORT/api/health" > /dev/null 2>&1; then
 echo "✅ PocketBase pronto (PID: $PB_PID)"
 break
 fi
 sleep 1
done

# 7. Executar testes se fornecido como argumento
if [ "$1" = "--run-tests" ]; then
 echo " Executando testes de homologação..."
 node tests/homologation.test.mjs
 TEST_EXIT=$?
 exit $TEST_EXIT
else
 echo " Ambiente pronto. Execute os testes com: node tests/homologation.test.mjs"
 echo " O PocketBase será encerrado automaticamente ao sair deste shell."
 wait "$PB_PID"
fi