import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOMS,OBJECTS,SAVE_KEY,newGame,evaluateRoom,completeRoom,isUnlocked,sanitizeSave,kitchenDistances} from '../src/rules.js';

function solve(state,room){
 for(const def of OBJECTS[room]){
  const values=state.rooms[room][def.id];
  if(def.clean){values.cleaned=[0,1,2];continue;}
  for(const control of def.controls)values[control.key]=control.type==='choice'?control.ideal:(control.ideal[0]+control.ideal[1])/2;
  if(def.activity)values.practiced=true;
  if(def.activity==='carry')values.delivered=true;
 }
 if(room==='kitchen')Object.assign(state.rooms.kitchen.fridge,{x:0,z:0});
}

test('saved furniture transforms are bounded and cooking reloads with the burner off',()=>{
 const raw=newGame();raw.placements={office:{chair:{offset:[.7,0,-.2],rotation:Math.PI/4},invalid:{offset:[Infinity,0,0],rotation:0},bad:{offset:[0,0,0],rotation:NaN}}};
 raw.cooking={on:true,handle:1,stirred:true,served:true};
 const restored=sanitizeSave(raw);
 assert.deepEqual(restored.placements.office,{chair:{offset:[.7,0,-.2],rotation:Math.PI/4}});
 assert.deepEqual(restored.cooking,{on:false,handle:1,stirred:true,served:true});
 assert.deepEqual(sanitizeSave(restored),restored);
});

test('all five areas start incomplete and reach 100 with suitable settings and completed activities',()=>{
 const state=newGame();
 assert.deepEqual(ROOMS.map(room=>room.id),['office','kitchen','home','outdoor','workshop']);
 for(const room of ROOMS){
  const before=evaluateRoom(room.id,state.rooms[room.id]);
  assert.equal(before.canComplete,false,room.id);assert.ok(before.score<60,room.id);
  solve(state,room.id);
  const result=evaluateRoom(room.id,state.rooms[room.id]);
  assert.equal(result.score,100,room.id);assert.equal(result.done,5,room.id);assert.equal(result.canComplete,true,room.id);
  assert.deepEqual(result.metrics,[100,100,100],room.id);
 }
});

test('score responds in both directions and dirt must be unique and genuinely cleaned',()=>{
 const state=newGame();solve(state,'office');const values=state.rooms.office;
 values.monitor.height=150;
 assert.ok(evaluateRoom('office',values).score<100);
 values.dirt.cleaned=[0,0,0];
 assert.equal(evaluateRoom('office',values).tasks.find(task=>task.id==='dirt').done,false);
 values.dirt.cleaned=[0,1,9,-1,1];
 assert.equal(evaluateRoom('office',values).tasks.find(task=>task.id==='dirt').quality,2/3);
});

test('office desk height affects the sitting mission and overall score',()=>{
 const state=newGame();solve(state,'office');state.rooms.office.chair.deskHeight=90;
 const result=evaluateRoom('office',state.rooms.office);
 assert.ok(result.score<100);assert.equal(result.tasks.find(task=>task.id==='chair').done,false);
 state.rooms.office.chair.deskHeight=73;assert.equal(evaluateRoom('office',state.rooms.office).score,100);
});

test('indoor projects unlock in order, outdoor is freely accessible, and rewards cannot be farmed',()=>{
 const state=newGame();
 assert.equal(isUnlocked(state,1),false);assert.equal(isUnlocked(state,2),false);
 assert.equal(isUnlocked(state,3),true);assert.equal(isUnlocked(state,4),false);assert.equal(completeRoom(state).ok,false);
 for(let index=0;index<ROOMS.length;index++){
  assert.equal(isUnlocked(state,index),true);state.current=index;solve(state,ROOMS[index].id);
  assert.equal(completeRoom(state).reward,ROOMS[index].reward);assert.equal(completeRoom(state).reward,0);
 }
 assert.equal(state.xp,2100);assert.equal(state.completed.length,5);
 for(const index of [-1,5,.5,'0',NaN,Infinity,null,undefined])assert.equal(isUnlocked(state,index),false,String(index));
});

test('outdoor can be completed first without bypassing indoor prerequisites or losing saved rewards',()=>{
 const state=newGame();state.current=3;solve(state,'outdoor');completeRoom(state);
 assert.equal(state.xp,500);assert.equal(isUnlocked(state,1),false);assert.equal(isUnlocked(state,4),false);
 assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(state))),state);
 state.current=0;solve(state,'office');completeRoom(state);
 assert.deepEqual(sanitizeSave(state),state);assert.deepEqual(state.completed,['outdoor','office']);assert.equal(isUnlocked(state,1),true);
});

test('posture activities require practice with suitable controls',()=>{
 const state=newGame();solve(state,'home');state.rooms.home.mop.practiced=false;
 let result=evaluateRoom('home',state.rooms.home);
 assert.equal(result.canComplete,false);assert.equal(result.tasks.find(task=>task.id==='mop').done,false);
 state.rooms.home.mop.practiced=true;state.rooms.home.mop.length=85;
 result=evaluateRoom('home',state.rooms.home);
 assert.equal(result.tasks.find(task=>task.id==='mop').done,false);assert.equal(sanitizeSave(state).rooms.home.mop.practiced,false);
});

test('carrying requires correct posture, a practiced lift, and physical delivery',()=>{
 const state=newGame();solve(state,'outdoor');const carry=state.rooms.outdoor.carry;
 carry.delivered=false;
 let result=evaluateRoom('outdoor',state.rooms.outdoor);
 assert.equal(result.canComplete,false);assert.equal(result.tasks.find(task=>task.id==='carry').done,false);
 carry.delivered=true;carry.practiced=false;assert.equal(evaluateRoom('outdoor',state.rooms.outdoor).canComplete,false);
 carry.practiced=true;carry.posture=0;assert.equal(evaluateRoom('outdoor',state.rooms.outdoor).canComplete,false);
 assert.deepEqual(sanitizeSave(state).rooms.outdoor.carry,{posture:0,practiced:false,delivered:false});
 carry.posture=1;assert.equal(evaluateRoom('outdoor',state.rooms.outdoor).score,100);
});

test('kitchen uses measured distances instead of a canned layout score',()=>{
 const distances=kitchenDistances({x:0,z:0});assert.ok(distances.every(value=>value>=1.2&&value<=3.1));
 const state=newGame();solve(state,'kitchen');const good=evaluateRoom('kitchen',state.rooms.kitchen).score;
 state.rooms.kitchen.fridge.x=3.2;state.rooms.kitchen.fridge.z=1.5;
 assert.ok(evaluateRoom('kitchen',state.rooms.kitchen).score<good);
});

test('saved state and onboarding survive reload and malformed saves stay bounded',()=>{
 const state=newGame();solve(state,'office');completeRoom(state);state.current=1;
 state.onboarding.completed=true;state.settings.tutorialCompleted=true;
 assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(state))),state);
 const bad={version:3,current:99,xp:999999,completed:['home'],rooms:{office:{chair:{height:Infinity,back:-999,deskHeight:999},dirt:{cleaned:[0,0,6,'1']}},outdoor:{path:{x:Infinity,rotation:765},carry:{posture:15,practiced:true,delivered:true}}},onboarding:{completed:'yes',skipped:true},settings:{quality:'ultra',sensitivity:'bad',tutorialCompleted:'true'}};
 const clean=sanitizeSave(bad);
 assert.equal(clean.current,0);assert.equal(clean.xp,0);assert.equal(clean.rooms.office.chair.height,59);
 assert.equal(clean.rooms.office.chair.back,80);assert.equal(clean.rooms.office.chair.deskHeight,90);
 assert.deepEqual(clean.rooms.office.dirt.cleaned,[0]);assert.deepEqual(clean.rooms.outdoor.carry,{posture:0,practiced:false,delivered:false});
 assert.deepEqual(clean.rooms.outdoor.path,{x:0,rotation:45});assert.deepEqual(clean.onboarding,{completed:false,skipped:true});
 assert.equal(clean.settings.quality,'auto');assert.equal(clean.settings.tutorialCompleted,false);assert.deepEqual(sanitizeSave(null),newGame());
});

test('v2 migration keeps completed studio, XP, and room identity when outdoor is inserted',()=>{
 const legacy=newGame();legacy.version=2;
 for(const room of ['office','kitchen','home','workshop'])solve(legacy,room);
 legacy.completed=['office','kitchen','home','workshop'];legacy.current=3;legacy.xp=1600;
 legacy.best={office:100,kitchen:100,home:100,workshop:100};
 delete legacy.rooms.outdoor;delete legacy.rooms.office.chair.deskHeight;delete legacy.onboarding;
 const migrated=sanitizeSave(legacy);
 assert.equal(SAVE_KEY,'ergoflip-save-v2');assert.equal(migrated.version,3);assert.equal(migrated.current,4);assert.equal(migrated.xp,1600);
 assert.deepEqual(migrated.completed,legacy.completed);assert.deepEqual(migrated.best,legacy.best);
 assert.equal(migrated.rooms.office.chair.deskHeight,73);assert.equal(isUnlocked(migrated,4),true);
 assert.equal(evaluateRoom('outdoor',migrated.rooms.outdoor).canComplete,false);assert.deepEqual(sanitizeSave(migrated),migrated);
 migrated.current=3;solve(migrated,'outdoor');assert.equal(completeRoom(migrated).reward,500);assert.equal(migrated.xp,2100);
});

test('v2 players approaching an unfinished studio are routed to the newly available outdoor project',()=>{
 const state=sanitizeSave({version:2,current:3,completed:['office','kitchen','home'],best:{office:90,kitchen:95,home:100}});
 assert.equal(state.current,3);assert.equal(state.xp,1050);assert.equal(isUnlocked(state,3),true);assert.equal(isUnlocked(state,4),false);
});
