import { chromium } from '@playwright/test';
import { newGame, ROOMS, SAVE_KEY } from '../src/rules.js';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args:['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport:{width:1440,height:900}, deviceScaleFactor:1 });
page.on('pageerror',error=>console.log('PAGE ERROR:',error.message));
page.on('console',message=>{if(message.type()==='error')console.log('CONSOLE ERROR:',message.text());});
await page.goto('http://localhost:5173');
await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',{},{timeout:60000});
await page.waitForTimeout(1200);
await page.screenshot({path:'test-results/welcome-preview.png'});
if(await page.locator('#skip-tutorial').isVisible())await page.locator('#skip-tutorial').click();
console.log(JSON.stringify(await page.evaluate(()=>window.ergoDebug.snapshot())));
await page.screenshot({path:'test-results/desktop-preview.png'});
await page.close();
for(let i=1;i<ROOMS.length;i++){
 const roomPage=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const state=newGame();state.current=i;state.completed=ROOMS.slice(0,i).map(r=>r.id);state.onboarding.skipped=true;
 await roomPage.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:SAVE_KEY,state});
 await roomPage.goto('http://localhost:5173');await roomPage.waitForFunction(()=>document.documentElement.dataset.ready==='true');await roomPage.locator('#loading').waitFor({state:'hidden'});
 await roomPage.screenshot({path:`test-results/${ROOMS[i].id}-preview.png`});
 console.log(ROOMS[i].id,JSON.stringify(await roomPage.evaluate(()=>({room:window.ergoDebug.snapshot().room,calls:window.ergoDebug.snapshot().drawCalls,triangles:window.ergoDebug.snapshot().triangles}))));
 await roomPage.close();
}
await browser.close();
