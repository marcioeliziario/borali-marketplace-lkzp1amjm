# BORALI | Marketplace do Comércio Local ("Sua cidade, mais perto de você")

Plataforma web multiempresa e multicidade voltada para a digitalização do comércio local, tendo como primeira cidade de atuação **Óbidos, Pará**.

---

## 1. Visão Geral da Versão 0.1 (Fundação e Identidade Visual)

Esta primeira versão (v0.1) implementa estritamente os requisitos definidos na **Seção 15 do Documento de Especificação**, sem antecipações prematuras de integrações externas:

- **Identidade Visual:** Inspirada na bandeira de Óbidos (Azul principal `#1754AE`, Vermelho `#E63239`, Branco `#FFFFFF`, Fundo secundário `#F5F7FA`, Texto `#172033`). Logotipo e favicon próprios em formato vetorial (SVG) e tipografia moderna.
- **PWA (Progressive Web App):** Manifesto web (`/manifest.json`), meta tags mobile e navegação inferior ergonômica (Início, Buscar, Pedidos, Perfil).
- **Arquitetura Multicidade e Multiempresa:** Isolamento comercial entre estabelecimentos comerciais via regras no backend Skip Cloud (PocketBase).
- **Perfis de Acesso (4 funções):** Cliente (`customer`), Comerciante (`merchant`), Entregador (`delivery`), Administrador Geral (`admin`).

---

## 2. Coleções do Banco de Dados (PocketBase)

1. **`users` (auth):**
   - Papéis (`role`: admin, merchant, delivery, customer).
   - Vínculo a estabelecimento (`store_id`) para controle de acesso do comerciante.
   - Proteção estrita contra autoatribuição de permissões administrativas.
2. **`cities` (base):**
   - Dados de cidades atendidas (`name`, `state`, `slug`, `is_active`, `is_pilot`).
   - Primeira cidade cadastrada: Óbidos (`obidos`), Pará (`PA`).
3. **`categories` (base):**
   - 19 categorias comerciais iniciais da especificação (Mercados e mercearias, Bebidas, Farmácias, Restaurantes e lanchonetes, Açougues, Peixarias, Frutas e verduras, Padarias, Açaí e sorvetes, Gás e água, Pet shops, Beleza e perfumaria, Sabores da Terra, Moda e calçados, Construção e ferramentas, Motopeças, Papelaria, Casa e utilidades, Presentes e festas).
4. **`stores` (base):**
   - Estabelecimentos comerciais (`name`, `trade_name`, `slug`, `city_id`, `category_ids`, horários em JSON, taxas de entrega, pedido mínimo, tempo estimado, status de aprovação).
   - Isolamento comercial: lojista só atualiza seu próprio estabelecimento (`store_id = @request.auth.store_id`).
5. **`products` (base):**
   - Catálogo de produtos com nome, descrição, unidade de medida (`un`, `kg`, `g`, `l`, `ml`, `cx`, `pct`, `fardo`, `duzia`), preço, preço promocional, estoque, código de barras, marca, tag de dados demonstrativos (`is_demo`) e flag de produto regulado (`is_regulated`).
6. **`orders` (base):**
   - Estrutura completa de pedidos com identificação única, status (`awaiting_confirmation`, `confirmed`, `preparing`, `ready_for_pickup`, `out_for_delivery`, `delivered`, `cancelled`), itens congelando os preços da compra e endereço completo de entrega.
7. **`audit_log` (base):**
   - Registro de auditoria para conformidade com a LGPD e rastreabilidade de acessos e operações críticas da plataforma.

---

## 3. Dados Piloto em Óbidos / PA

Conforme a Seção 14 da especificação:
- **Cidade Piloto:** Óbidos, Pará.
- **Estabelecimento 1:** Distribuidora Barbosa (categoria Bebidas).
- **Estabelecimento 2:** Mercadinho (nome a confirmar, categoria Mercados e mercearias).
- **Dados Demonstrativos:** Catálogo e produtos de amostra identificados explicitamente com a tag e prefixo `[DEMO]` para testes de layout e estrutura sem inventar dados comerciais reais.

---

## 4. Rotas da Aplicação

- `/:citySlug` (ex: `/obidos`) — Página inicial do marketplace com seletor de cidades, busca, banners, categorias e estabelecimentos ativos.
- `/:citySlug/:storeSlug` (ex: `/obidos/distribuidora-barbosa`) — Loja virtual individual com capa, dados de contato, horários, catálogo e estrutura de carrinho.
- `/painel-lojista` — Painel do comerciante para cadastro/edição de produtos, estoque, pedidos (estrutura) e configurações comerciais com isolamento estrito.
- `/admin` — Painel da administração geral para aprovação de estabelecimentos, gestão de cidades, categorias, auditoria e usuários.
- `/login` — Autenticação unificada e cadastro de clientes (cadastros de admin e comerciantes são protegidos e controlados).
- `/carrinho` e `/pedidos` — Estrutura de carrinho (1 loja por pedido) e acompanhamento.
- `/roadmap` — Página interativa documentando a evolução v0.1 a v1.0.

---

## 5.1 Estado atual (v0.2)

- **Painel do comerciante** (`/painel-lojista`): formulário completo em seções (informações, fotos com upload múltiplo, preços e promoção com período, estoque com movimentações, variações, complementos, lote/peso), categorias internas, ações em lote (arquivar, duplicar, ativar/desativar), ajuste de estoque com histórico e importação/exportação CSV com pré-visualização e modelo.
- **Backend (Skip Cloud / PocketBase):** 9 coleções em produção de dados (`cities`, `categories`, `stores`, `products`, `orders`, `audit_log`, `store_categories`, `stock_movements`, `users`), hooks em `pocketbase/hooks/products.pb.js` com isolamento server-side entre estabelecimentos, auditoria em criação/atualização/exclusão/movimentação de estoque e migrações versionadas em `pocketbase/migrations/`.
- **Usuário de teste:** `comerciante.mercadinho@borali.local` (role `merchant`, vinculado ao Mercadinho, senha `Skip@Pass`) criado pela migração 0006 para validar isolamento entre lojas — teste automatizado em `scripts/test-isolamento.ts` (rode com `npx tsx scripts/test-isolamento.ts`).
- **Util central de promoções:** `src/lib/catalog.ts` (getPromoInfo / isPromoActive / getEffectivePrice) — único ponto de verdade para exibir preço riscado e % apenas quando a promoção está vigente.
- **Preview:** `https://borali--preview.goskip.app` (rotas `/obidos/mercadinho` e `/obidos/distribuidora-barbosa`).

---

## 5. Roadmap Oficial Borali

- **v0.1:** Fundação e identidade visual (Concluída).
- **v0.2:** Catálogo completo e gestão avançada de produtos (Concluída — painel do lojista em seções, promoções com período, estoque com movimentações, variações, complementos, fotos, ações em lote, CSV com prévia, auditoria server-side e usuário de teste com isolamento validado).
- **v0.3:** Carrinho interativo e fluxo completo de pedidos.
- **v0.4:** Pagamentos integrados (Pix automático, dinheiro e maquininha) e módulo de entregadores.
- **v0.5:** Gestão financeira, comissões e conciliação.
- **v0.6:** Integração oficial com WhatsApp.
- **v1.0:** Lançamento comercial oficial em Óbidos/PA.
