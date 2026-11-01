// Optional real-browser QA against the running local demo; never a production URL.
const {chromium}=require(process.env.MADANI_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const timer=setTimeout(()=>process.exit(2),120000);
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const credentials=JSON.parse(fs.readFileSync('/tmp/madani-minimart-accounts.json','utf8')).accounts;
 async function login(email,width=1440){
  const page=await browser.newPage({viewport:{width,height:900},permissions:['geolocation'],geolocation:{latitude:-8.5854,longitude:116.5755}});
  page.on('pageerror',e=>console.error('Browser error:',e.message));
  await page.goto('http://127.0.0.1:4179/',{waitUntil:'networkidle',timeout:20000});
  if(await page.locator('#madaniLocationDialog').isVisible())await page.locator('[data-location-later]').click();
  await page.locator('#continueWebBtn').click();await page.locator('#email').fill(email);await page.locator('#password').fill(credentials[email]);await page.locator('#loginButton').click();
  await page.waitForURL('**/app/**',{timeout:20000});await page.locator('.premium-home').waitFor({timeout:10000});return page;
 }
 const page=await login('mart@madani.app');await page.screenshot({path:'/tmp/minimart-home-desktop.png',fullPage:true});
 await page.locator('[data-home-route="minimart-shift"]').click();await page.locator('#mmOpen').waitFor();await page.locator('[name=openingCash]').fill('100000');await page.locator('#mmOpen button').click();await page.locator('#mmClose').waitFor();
 await page.locator('[data-mm-route="pos"]').click();
 for(const id of ['a','b','c'])await page.locator(`[data-product="${id}"]`).click();
 await page.locator('#mmStudent').selectOption('MM-S1');await page.locator('#mmWallet').filter({hasText:'100.000'}).waitFor();await page.locator('#mmConfirmStudent').check();await page.locator('#mmMethod').selectOption('WALLET');await page.locator('[name=pin]').fill('483729');await page.locator('#mmPay').scrollIntoViewIfNeeded();
 await page.screenshot({path:'/tmp/minimart-pos-desktop.png',fullPage:true});await page.locator('#mmPay').click();await page.locator('#mmReceipt .mm-receipt').waitFor();assert.match(await page.locator('#mmReceipt').innerText(),/25.000/);
 await page.locator('[data-product="a"]').click();await page.locator('[name=cashReceived]').fill('20000');await page.locator('#mmPay').click();await page.locator('#mmReceipt').filter({hasText:'Kembalian'}).waitFor();assert.match(await page.locator('#mmReceipt').innerText(),/10.000/);
 await page.locator('[data-product="a"]').click();await page.locator('#mmStudent').selectOption('MM-S1');await page.locator('#mmWallet').filter({hasText:'75.000'}).waitFor();await page.locator('#mmConfirmStudent').check();await page.locator('#mmMethod').selectOption('MIXED');await page.locator('[name=walletAmount]').fill('5000');await page.locator('[name=cashReceived]').fill('10000');await page.locator('[name=pin]').fill('483729');await page.locator('#mmPay').click();await page.locator('#mmReceipt .mm-receipt').waitFor();
 await page.locator('[data-mm-route="reports"]').click();await page.locator('#mmReport').filter({hasText:'45.000'}).waitFor();await page.screenshot({path:'/tmp/minimart-reports-desktop.png',fullPage:true});
 const mobile=await login('mart@madani.app',390);await mobile.screenshot({path:'/tmp/minimart-home-mobile.png',fullPage:true});await mobile.locator('[data-home-route="minimart-pos"]').click();await mobile.locator('#mmProducts').waitFor();await mobile.locator('[data-product="c"]').click();await mobile.screenshot({path:'/tmp/minimart-pos-mobile.png',fullPage:true});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(await mobile.locator('#mmJump').isVisible())await mobile.locator('#mmJump').click();await mobile.locator('[name=cashReceived]').fill('10000');await mobile.locator('#mmPay').scrollIntoViewIfNeeded();await mobile.screenshot({path:'/tmp/minimart-cart-mobile.png',fullPage:true});
 await mobile.locator('[data-mm-route="products"]').click();await mobile.locator('#mmProductForm').waitFor();await mobile.screenshot({path:'/tmp/minimart-products-mobile.png',fullPage:true});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const parent=await login('parent@example.test',390);await parent.goto('http://127.0.0.1:4179/app/index.html#parent-finance');await parent.locator('#mmParent').filter({hasText:'70.000'}).waitFor();assert.match(await parent.locator('#mmParent').innerText(),/Santri Uji Putra/);await parent.screenshot({path:'/tmp/minimart-parent-mobile.png',fullPage:true});
 const manager=await login('supervisor@example.test');await manager.goto('http://127.0.0.1:4179/app/index.html#minimart-history');await manager.locator('[data-refund]').first().waitFor();assert.ok(await manager.locator('[data-refund]').count()>0);
 console.log('Browser QA passed: Auth login, shift, wallet/cash/mixed receipts, reports, supervisor refund controls, parent balance, desktop and 390px layouts.');
 await browser.close();clearTimeout(timer);
})().catch(error=>{console.error(error.message);process.exit(1);});
