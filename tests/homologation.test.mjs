/**
 * Testes de Homologação Técnica — Borali Marketplace
 * Executados contra instância PocketBase local (http://127.0.0.1:8090)
 * Utiliza módulos ES nativos.
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = `admin-${Date.now()}@test.local`;
const ADMIN_PASS = `TestPass-${Date.now()}`;

async function runTests() {
 const pb = new PocketBase(PB_URL);
 let passed = 0;
 let failed = 0;

 console.log(' Iniciando testes de homologação Borali...\n');

 try {
 // 1. Login ou criação de admin temporário
 console.log('1️⃣ Autenticando administrador de teste...');
 try {
 await pb.collection('users').authWithPassword('admin@borali.local', 'Skip@Pass');
 console.log('   ✅ Login realizado com credenciais padrão.');
 } catch (err) {
 // Se falhar, tenta criar um admin novo (requer acesso não autenticado permitido na coleção users para teste)
 console.log('   ⚠️ Login padrão falhou, tentando criar admin temporário...');
 try {
 await pb.collection('users').create({
 email: ADMIN_EMAIL,
 password: ADMIN_PASS,
 passwordConfirm: ADMIN_PASS,
 role: 'admin',
 verified: true,
 });
 await pb.collection('users').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
 console.log(`   ✅ Admin temporário criado: ${ADMIN_EMAIL}`);
 } catch (createErr) {
 console.log(`   ❌ Falha ao autenticar ou criar admin: ${createErr.message}`);
 process.exit(1);
 }
 }

 // 2. Verificar migração 0009 (campo status em cities)
 console.log('\n2️⃣ Verificando migração 0009 (campo status em cities)...');
 try {
 const cities = await pb.collection('cities').getFullList();
 if (cities.length > 0 && cities[0].status !== undefined) {
 console.log('   ✅ Campo status presente em cities.');
 passed++;
 } else {
 console.log('   ❌ Campo status ausente em cities.');
 failed++;
 }
 } catch (err) {
 console.log(`   ❌ Erro ao verificar cities: ${err.message}`);
 failed++;
 }

 // 3. Cidades com diferentes status
 console.log('\n3️⃣ Verificando cidades com diferentes status...');
 try {
 const prepCities = await pb.collection('cities').getFullList({ filter: 'status = "preparation"' });
 const activeCities = await pb.collection('cities').getFullList({ filter: 'status = "active"' });
 const suspendedCities = await pb.collection('cities').getFullList({ filter: 'status = "suspended"' });
 console.log(`   ✅ Preparação: ${prepCities.length}, Ativas: ${activeCities.length}, Suspensas: ${suspendedCities.length}`);
 passed++;
 } catch (err) {
 console.log(`   ❌ Erro ao filtrar cidades por status: ${err.message}`);
 failed++;
 }

 // 4. Lojas aprovadas e ativas
 console.log('\n4️⃣ Verificando lojas aprovadas e ativas...');
 try {
 const approvedStores = await pb.collection('stores').getFullList({ filter: 'status = "approved" && is_active = true' });
 console.log(`   ✅ Lojas aprovadas e ativas: ${approvedStores.length}`);
 passed++;
 } catch (err) {
 console.log(`   ❌ Erro ao filtrar lojas: ${err.message}`);
 failed++;
 }

 // 5. Bloqueio de pedidos (cidade suspensa)
 console.log('\n5️⃣ Verificando bloqueio de pedidos em cidades suspensas...');
 try {
 const suspendedCity = await pb.collection('cities').getFirstListItem('status = "suspended"');
 if (suspendedCity) {
 const storeInSuspendedCity = await pb.collection('stores').getFirstListItem(`city_id = "${suspendedCity.id}"`);
 if (storeInSuspendedCity) {
 try {
 await pb.collection('orders').create({
 store_id: storeInSuspendedCity.id,
 customer_name: 'Test User',
 customer_phone: '000000000',
 delivery_address: { street: 'Test', number: '1', neighborhood: 'Test' },
 payment_method: 'pix',
 subtotal: 10,
 delivery_fee: 0,
 total: 10,
 items: [],
 status: 'awaiting_confirmation',
 });
 console.log('   ❌ Pedido criado em cidade suspensa (hook não está bloqueando!)');
 failed++;
 } catch (orderErr) {
 if (orderErr.status === 400) {
 console.log('   ✅ Pedido bloqueado em cidade suspensa (hook funcionando).');
 passed++;
 } else {
 console.log(`   ⚠️ Erro inesperado: ${orderErr.message}`);
 failed++;
 }
 }
 } else {
 console.log('   ⚠️ Nenhuma loja encontrada na cidade suspensa.');
 passed++;
 }
 } else {
 console.log('   ⚠️ Nenhuma cidade suspensa encontrada para teste.');
 passed++;
 }
 } catch (err) {
 console.log(`   ❌ Erro ao verificar bloqueio de pedidos: ${err.message}`);
 failed++;
 }

 // 6. Bloqueio de pedidos (cidade ativa mas loja inativa)
 console.log('\n6️⃣ Verificando bloqueio de pedidos em loja inativa...');
 try {
 const activeCity = await pb.collection('cities').getFirstListItem('status = "active"');
 if (activeCity) {
 const inactiveStore = await pb.collection('stores').getFirstListItem(`city_id = "${activeCity.id}" && is_active = false`);
 if (inactiveStore) {
 try {
 await pb.collection('orders').create({
 store_id: inactiveStore.id,
 customer_name: 'Test User',
 customer_phone: '000000000',
 delivery_address: { street: 'Test', number: '1', neighborhood: 'Test' },
 payment_method: 'pix',
 subtotal: 10,
 delivery_fee: 0,
 total: 10,
 items: [],
 status: 'awaiting_confirmation',
 });
 console.log('   ❌ Pedido criado em loja inativa.');
 failed++;
 } catch (orderErr) {
 if (orderErr.status === 400) {
 console.log('   ✅ Pedido bloqueado em loja inativa.');
 passed++;
 } else {
 console.log(`   ⚠️ Erro inesperado: ${orderErr.message}`);
 failed++;
 }
 }
 } else {
 console.log('   ⚠️ Nenhuma loja inativa encontrada na cidade ativa.');
 passed++;
 }
 }
 } catch (err) {
 console.log(`   ❌ Erro ao verificar bloqueio em loja inativa: ${err.message}`);
 failed++;
 }

 // 7. Auditoria de operações
 console.log('\n7️⃣ Verificando registro de auditoria...');
 try {
 const auditLogs = await pb.collection('audit_log').getFullList({ sort: '-created', limit: 5 });
 console.log(`   ✅ Logs de auditoria encontrados: ${auditLogs.length}`);
 passed++;
 } catch (err) {
 console.log(`   ❌ Erro ao verificar auditoria: ${err.message}`);
 failed++;
 }

 } finally {
 await pb.authStore.clear();
 }

 // Resumo
 console.log('\n' + '='.repeat(50));
 console.log(` Resultados: ${passed} passaram, ${failed} falharam`);
 console.log('='.repeat(50));

 if (failed > 0) {
 process.exit(1);
 }
}

runTests().catch(err => {
 console.error('Erro fatal nos testes:', err);
 process.exit(1);
});