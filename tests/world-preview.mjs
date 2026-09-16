import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://localhost:5173/');
 await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await page.locator('#skip-tutorial').click();
 await page.waitForTimeout(3500);
 await page.screenshot({path:'test-results/office-visual-preview.png'});
 console.log('office',await page.evaluate(()=>window.ergoDebug.snapshot()));
 await page.locator('#outdoor-button').click();
 await page.keyboard.press('f');
 await page.waitForTimeout(2000);
 await page.screenshot({path:'test-results/outdoor-visual-preview.png'});
 console.log('outdoor',await page.evaluate(()=>window.ergoDebug.snapshot()));
 await page.locator('#outdoor-button').click();
 await page.keyboard.press('f');
 await page.waitForTimeout(500);
 console.log('portal return',await page.evaluate(()=>window.ergoDebug.snapshot().room));
 console.log('errors',errors);
}finally{await browser.close();}
