# Inventário de Credenciais para Rotação

As seguintes credenciais foram expostas no histórico Git público e **devem ser rotacionadas** antes de qualquer deploy em produção ou homologação compartilhada.

## 1. Senhas de Teste / Homologação
Estas senhas estão presentes no arquivo `.env` commitado anteriormente e nos scripts de seed (`0004_seed_pilot_data.js`, `0006_test_user_v02.js`):
- `Skip@Pass` (Senha padrão para usuários admin e comerciantes piloto)
- `HOMOLOG_MERC_PASSWORD`
- `HOMOLOG_BARBOSA_PASSWORD`
- `BORALI_TEST_USER_PASS`

**Ação:** Alterar as senhas dos usuários `admin@borali.local`, `comerciante.barbosa@borali.local` e `comerciante.mercadinho@borali.local` diretamente no painel administrativo do PocketBase ou via script de atualização de usuários.

## 2. Chaves de API / Homologação
- `BORALI_HOMOLOG_KEY`: Utilizada para testes de isolamento. Deve ser considerada comprometida e substituída por uma chave nova no ambiente de produção.

## 3. Tokens de Acesso
- Nenhum token de produção (Stripe, C6 Bank, etc.) foi encontrado no código atual, pois o projeto ainda está na fase de desenvolvimento local.

## Procedimento de Limpeza Histórica (Opcional)
Para remover permanentemente os arquivos `.env` do histórico Git, recomenda-se o uso de ferramentas como `git filter-repo` ou `BFG Repo-Cleaner` em uma branch de manutenção, seguido de force-push autorizado pelos mantenedores do repositório.

**Nota:** A simples remoção do arquivo do índice (`git rm --cached`) não apaga seu conteúdo das versões anteriores do repositório.