// This is an educational simulation for one fictional adult, not a clinical assessment.
export const SAVE_KEY = 'ergoflip-save-v2';
export const ROOMS = [
 {id:'office',name:'Kantor Fokus',short:'Kantor',icon:'office',title:'Ruang kerja,<br>lebih baik.',description:'Ubah kantor ini menjadi ruang yang mendukung tubuh dan produktivitas.',category:'ERGONOMI KANTOR',tip:'Mulai dari kursi. Postur yang nyaman menjadi fondasi ruang kerja yang baik.',reward:250,metrics:['Postur tubuh','Jangkauan kerja','Lingkungan']},
 {id:'kitchen',name:'Dapur Mengalir',short:'Dapur',icon:'kitchen',title:'Gerak efisien,<br>masak nyaman.',description:'Tata dapur agar persiapan, memasak, dan mencuci terasa lebih mudah.',category:'ERGONOMI DAPUR',tip:'Dekatkan zona kerja, lalu sisakan jalur yang lapang. Ukuran tubuh tetap menjadi acuan.',reward:350,metrics:['Tinggi kerja','Alur & jangkauan','Keamanan']},
 {id:'home',name:'Rumah Nyaman',short:'Rumah',icon:'home',title:'Rumah bersih,<br>tubuh terjaga.',description:'Pelajari cara menyapu, mengepel, dan mengangkat tanpa postur yang membebani tubuh.',category:'ERGONOMI RUMAH TANGGA',tip:'Gunakan langkah kecil saat membersihkan. Dekatkan beban dan hindari memutar punggung.',reward:450,metrics:['Postur aktivitas','Penataan ruang','Kebersihan']},
 {id:'outdoor',name:'Halaman Aman',short:'Halaman',icon:'outdoor',title:'Langkah bebas,<br>halaman nyaman.',description:'Keluar rumah, rawat taman, dan siapkan jalur yang aman untuk membawa barang.',category:'ERGONOMI OUTDOOR',tip:'Dekatkan beban ke tubuh, atur tinggi area berkebun, dan bebaskan jalur keluar rumah.',reward:500,metrics:['Postur aktivitas','Jalur berjalan','Keamanan']},
 {id:'workshop',name:'Studio Kreatif',short:'Studio',icon:'workshop',title:'Ide mengalir,<br>kerja nyaman.',description:'Proyek bonus: bangun studio dengan meja yang sesuai, alat terjangkau, dan sirkulasi yang aman.',category:'PROYEK BONUS · STUDIO KREATIF',tip:'Sesuaikan ketinggian meja dengan jenis pekerjaan. Simpan alat yang sering dipakai dekat tubuh.',reward:550,metrics:['Postur kerja','Jangkauan alat','Lingkungan']}
];
const range = (key,label,min,max,step,unit,ideal,hint) => ({key,label,min,max,step,unit,ideal,hint,type:'range'});
const choice = (key,label,options,ideal,hint) => ({key,label,options,ideal,hint,type:'choice'});
export const OBJECTS = {
 office:[
  {id:'chair',name:'Kursi & meja kerja',mission:'Sesuaikan posisi duduk',subtitle:'Tinggi kursi, meja & sandaran',icon:'chair',weight:25,metric:0,description:'Profil klien simulasi: tinggi 170 cm, tinggi lipat lutut 46 cm. Sesuaikan kursi dan meja agar kaki tersangga, bahu rileks, serta punggung ditopang.',controls:[range('height','Tinggi dudukan',38,62,1,'cm',[44,48],'Target klien: 44–48 cm. Telapak kaki tersangga rata.'),range('back','Sudut sandaran',80,125,1,'°',[100,110],'Sandaran sedikit rebah: 100–110° untuk klien ini.'),range('deskHeight','Tinggi meja kerja',65,90,1,'cm',[70,76],'Target klien: 70–76 cm. Siku dekat tubuh dan bahu tetap rileks.')]},
  {id:'monitor',name:'Monitor',mission:'Atur posisi monitor',subtitle:'Tinggi layar & jarak pandang',icon:'office',weight:25,metric:1,description:'Acuan klien saat duduk: mata 120 cm dari lantai. Tepi atas layar berada setinggi atau sedikit di bawah mata.',controls:[range('height','Tepi atas layar',95,150,1,'cm',[114,121],'Target klien: 114–121 cm dari lantai.'),range('distance','Jarak mata ke layar',35,100,1,'cm',[50,75],'Mulai dari 50–75 cm, lalu sesuaikan keterbacaan teks.')]},
  {id:'keyboard',name:'Keyboard',mission:'Dekatkan alat kerja',subtitle:'Jangkauan & posisi pergelangan',icon:'keyboard',weight:20,metric:1,description:'Bahu rileks, siku dekat tubuh, dan pergelangan lurus. Posisi keyboard memengaruhi seberapa jauh Anda harus meraih.',controls:[range('reach','Jangkauan dari tubuh',15,65,1,'cm',[20,35],'Target simulasi: 20–35 cm, tanpa meraih ke depan.'),range('tilt','Kemiringan keyboard',0,25,1,'°',[0,8],'Permukaan hampir datar membantu pergelangan tetap netral.')]},
  {id:'lamp',name:'Lampu meja',mission:'Seimbangkan pencahayaan',subtitle:'Intensitas cahaya & silau',icon:'sun',weight:15,metric:2,description:'Terangi permukaan kerja tanpa memantulkan lampu langsung ke layar atau mata.',controls:[range('lux','Cahaya area kerja',150,750,25,'lux',[300,500],'Target latihan: 300–500 lux. Angka ini adalah simulasi.'),choice('direction','Arah cahaya',['Ke layar','Dari samping'],1,'Arahkan cahaya dari samping untuk mengurangi pantulan.')]},
  {id:'dirt',name:'Area lantai',mission:'Bersihkan area kerja',subtitle:'Singkirkan 3 noda lantai',icon:'brush',weight:15,metric:2,clean:true,description:'Noda lantai mengganggu kenyamanan dan dapat menyebabkan terpeleset. Gunakan alat Bersihkan, lalu tangani setiap noda.'}
 ],
 kitchen:[
  {id:'counter',name:'Meja dapur',mission:'Sesuaikan tinggi meja',subtitle:'Permukaan persiapan makanan',icon:'sliders',weight:25,metric:0,description:'Klien simulasi memiliki tinggi siku berdiri 102 cm. Permukaan persiapan sebaiknya cukup rendah untuk bekerja dengan bahu rileks.',controls:[range('height','Tinggi meja',75,115,1,'cm',[88,94],'Target klien: 88–94 cm, sekitar 8–14 cm di bawah siku.')]},
  {id:'fridge',name:'Kulkas',mission:'Perbaiki alur dapur',subtitle:'Segitiga kulkas–sink–kompor',icon:'layout',weight:25,metric:1,layout:true,description:'Geser kulkas mendekati kedua zona lain. Latihan ini menargetkan setiap sisi segitiga 1,2–3,1 m, tanpa peralatan saling bertumpuk.',controls:[range('x','Posisi kiri–kanan',-2.5,3.2,.1,'m',[-.5,.5],'Cobalah posisi x sekitar 0 m.'),range('z','Posisi depan–belakang',-1.5,1.5,.1,'m',[-.3,.3],'Cobalah posisi z sekitar 0 m; periksa jarak aktual di bawah.')]},
  {id:'shelf',name:'Rak dapur',mission:'Turunkan barang berat',subtitle:'Penyimpanan dalam jangkauan',icon:'box',weight:20,metric:1,description:'Simpan peralatan berat dalam jangkauan nyaman. Hindari mengangkat barang berat dari atas kepala.',controls:[range('height','Tinggi rak barang berat',55,190,5,'cm',[75,125],'Target klien: 75–125 cm untuk barang yang berat.')]},
  {id:'cart',name:'Troli dapur',mission:'Lapangkan jalur kerja',subtitle:'Sediakan lintasan ≥ 90 cm',icon:'move',weight:15,metric:2,layout:true,description:'Pindahkan troli ke sisi ruangan agar jalur berjalan di tengah tetap terbuka.',controls:[range('x','Posisi troli',-2.5,2.5,.1,'m',[-2.5,-1.5],'Pindahkan ke sisi kiri (x ≤ −1,5 m). Jalur utama perlu ≥ 90 cm.')]},
  {id:'dirt',name:'Tumpahan dapur',mission:'Bersihkan tumpahan',subtitle:'Hilangkan 3 bahaya terpeleset',icon:'brush',weight:15,metric:2,clean:true,description:'Amankan lantai yang basah sebelum melanjutkan aktivitas memasak.'}
 ],
 home:[
  {id:'broom',name:'Sapu',mission:'Menyapu dengan nyaman',subtitle:'Panjang gagang & gerak tubuh',icon:'brush',weight:25,metric:0,activity:'sweep',description:'Sesuaikan panjang gagang, jaga punggung netral, dan gerakkan kaki mengikuti sapuan. Selesaikan latihan setelah postur sesuai.',controls:[range('length','Panjang gagang',85,155,5,'cm',[120,145],'Target klien: 120–145 cm, sehingga tidak harus membungkuk.'),choice('posture','Gerakan menyapu',['Bungkuk & memutar','Melangkah, punggung netral'],1,'Gunakan langkah kecil; jangan memutar pinggang berulang.')]},
  {id:'mop',name:'Pel lantai',mission:'Mengepel tanpa membungkuk',subtitle:'Gagang pel & posisi tubuh',icon:'brush',weight:25,metric:0,activity:'mop',description:'Pegang pel dekat tubuh dan gerakkan kaki mengikuti arah pel. Pilih postur lalu praktikkan pada noda.',controls:[range('length','Panjang gagang pel',85,160,5,'cm',[125,150],'Target klien: 125–150 cm.'),choice('posture','Postur mengepel',['Jangkau jauh','Dekat tubuh & melangkah'],1,'Punggung tetap netral; hindari menjangkau jauh.')]},
  {id:'box',name:'Kotak barang',mission:'Angkat barang dengan aman',subtitle:'Dekatkan beban & tekuk lutut',icon:'box',weight:20,metric:0,activity:'lift',description:'Kotak latihan berbobot 5 kg. Dekatkan ke tubuh, tekuk lutut dan pinggul, lalu naikkan secara terkendali. Jika terlalu berat, minta bantuan.',controls:[choice('posture','Teknik mengangkat',['Punggung membungkuk','Tekuk lutut, beban dekat'],1,'Jaga punggung netral dan jangan memutar tubuh saat mengangkat.')]},
  {id:'sofa',name:'Sofa',mission:'Buka jalur aktivitas',subtitle:'Geser furnitur dari lintasan',icon:'move',weight:15,metric:1,layout:true,description:'Berikan ruang untuk melangkah saat membersihkan agar Anda tidak harus meraih melewati furnitur.',controls:[range('x','Posisi sofa',-2.7,.5,.1,'m',[-2.7,-1.8],'Geser ke kiri (x ≤ −1,8 m) untuk menyediakan ruang bergerak.')]},
  {id:'dirt',name:'Noda rumah',mission:'Tuntaskan bersih-bersih',subtitle:'Bersihkan 3 noda dengan postur baik',icon:'brush',weight:15,metric:2,clean:true,description:'Selesaikan latihan menyapu dan mengepel terlebih dahulu, lalu bersihkan sisa noda.'}
 ],
 outdoor:[
  {id:'carry',name:'Kotak taman',mission:'Bawa barang ke tujuan',subtitle:'Beban dekat tubuh & antar ke teras',icon:'box',weight:25,metric:0,activity:'carry',description:'Kotak latihan berbobot 5 kg. Pilih postur, angkat kotak, lalu bawa melalui jalur taman ke penanda tujuan. Bebaskan lintasan sebelum mengantar.',controls:[choice('posture','Posisi membawa barang',['Beban jauh dari tubuh','Beban dekat, punggung netral'],1,'Pegang kotak dekat tubuh, pandangan ke depan, dan berputar dengan langkah kaki.')]},
  {id:'planter',name:'Meja tanam',mission:'Atur tinggi area berkebun',subtitle:'Berkebun dengan punggung netral',icon:'sliders',weight:25,metric:0,description:'Naikkan permukaan berkebun agar klien tidak membungkuk terus-menerus. Target mengikuti tinggi siku klien simulasi dan kegiatan ringan.',controls:[range('height','Tinggi meja tanam',60,115,1,'cm',[85,100],'Target klien: 85–100 cm untuk menata tanaman ringan.')]},
  {id:'path',name:'Penghalang jalur',mission:'Bebaskan jalur keluar',subtitle:'Geser barang ke sisi halaman',icon:'move',weight:20,metric:1,layout:true,description:'Pindahkan penghalang ke sisi kanan halaman agar pintu, jalan setapak, dan area mengantar barang dapat dilalui.',controls:[range('x','Posisi penghalang',-3,3,.1,'m',[2,3],'Geser ke kanan (x 2–3 m) agar jalur tengah terbuka.')]},
  {id:'light',name:'Lampu halaman',mission:'Terangi jalan setapak',subtitle:'Cahaya cukup tanpa menyilaukan',icon:'sun',weight:15,metric:2,description:'Arahkan lampu ke permukaan jalan untuk memperjelas hambatan dan perubahan tinggi lantai. Angka cahaya merupakan target latihan simulasi.',controls:[range('lux','Cahaya jalur berjalan',50,250,10,'lux',[100,200],'Target latihan: 100–200 lux pada jalan setapak.'),choice('direction','Arah lampu',['Ke mata','Ke jalan setapak'],1,'Arahkan cahaya ke bawah, menuju jalan, untuk mengurangi silau.')]},
  {id:'dirt',name:'Sampah halaman',mission:'Rapikan jalan setapak',subtitle:'Singkirkan 3 tumpukan sampah',icon:'brush',weight:15,metric:2,clean:true,description:'Bersihkan daun dan sampah dari jalan setapak sebelum membawa barang melalui halaman.'}
 ],
 workshop:[
  {id:'bench',name:'Meja studio',mission:'Sesuaikan meja kerja',subtitle:'Tinggi untuk pekerjaan ringan',icon:'sliders',weight:25,metric:0,description:'Untuk perakitan ringan, tempatkan permukaan kerja sedikit di bawah siku. Profil klien: siku berdiri 102 cm.',controls:[range('height','Tinggi meja',70,120,1,'cm',[92,100],'Target klien: 92–100 cm untuk pekerjaan ringan.')]},
  {id:'tools',name:'Papan alat',mission:'Dekatkan alat utama',subtitle:'Jangkauan alat & tinggi rak',icon:'workshop',weight:25,metric:1,description:'Alat yang paling sering digunakan harus bisa dijangkau dengan mudah, tanpa mengangkat bahu atau meraih jauh.',controls:[range('height','Tinggi alat utama',80,190,5,'cm',[100,140],'Target klien: 100–140 cm.'),range('reach','Jarak alat dari tubuh',20,80,5,'cm',[20,40],'Jaga alat utama dalam jangkauan sekitar 40 cm.')]},
  {id:'lamp',name:'Lampu studio',mission:'Terangi area detail',subtitle:'Cahaya cukup tanpa silau',icon:'sun',weight:20,metric:2,description:'Aktivitas detail memerlukan cahaya tambahan yang diarahkan ke benda kerja.',controls:[range('lux','Cahaya area kerja',200,1000,50,'lux',[500,750],'Target latihan: 500–750 lux untuk perakitan detail.'),choice('direction','Arah lampu',['Ke mata','Ke benda kerja'],1,'Hindari sumber cahaya langsung menghadap mata.')]},
  {id:'cart',name:'Troli peralatan',mission:'Rapikan sirkulasi studio',subtitle:'Bebaskan jalur tengah ruangan',icon:'move',weight:15,metric:1,layout:true,description:'Parkirkan troli di sisi ruangan agar jalur kerja tidak terhalang.',controls:[range('x','Posisi troli',-2.5,2.5,.1,'m',[-2.5,-1.5],'Geser ke kiri (x ≤ −1,5 m) untuk membuka jalur.') ]},
  {id:'dirt',name:'Sisa material',mission:'Bersihkan sisa pekerjaan',subtitle:'Angkat 3 sisa material lantai',icon:'brush',weight:15,metric:2,clean:true,description:'Tuntaskan pekerjaan dengan membersihkan serpihan dan sisa material dari jalur berjalan.'}
 ]
};
const INITIAL = {
 office:{chair:{height:59,back:85,deskHeight:84},monitor:{height:142,distance:90},keyboard:{reach:53,tilt:18},lamp:{lux:200,direction:0},dirt:{cleaned:[]}},
 kitchen:{counter:{height:110},fridge:{x:3.1,z:-.7},shelf:{height:180},cart:{x:0},dirt:{cleaned:[]}},
 home:{broom:{length:95,posture:0,practiced:false},mop:{length:100,posture:0,practiced:false},box:{posture:0,practiced:false},sofa:{x:.2},dirt:{cleaned:[]}},
 outdoor:{carry:{posture:0,practiced:false,delivered:false},planter:{height:65},path:{x:0},light:{lux:50,direction:0},dirt:{cleaned:[]}},
 workshop:{bench:{height:77},tools:{height:180,reach:70},lamp:{lux:250,direction:0},cart:{x:.1},dirt:{cleaned:[]}}
};
export function newGame(){return {version:3,current:0,placements:{},cooking:{on:false,handle:0,stirred:false,served:false},completed:[],best:{},xp:0,rooms:structuredClone(INITIAL),onboarding:{completed:false,skipped:false},settings:{quality:'auto',sensitivity:1,sound:false,labels:true,tutorialCompleted:false}};}
export const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export function suitability(value,ideal,min,max){ if(value>=ideal[0]&&value<=ideal[1])return 1; const gap=value<ideal[0]?ideal[0]-value:value-ideal[1];return clamp(1-gap/((max-min)*.48),0,1); }
export function kitchenDistances(values){const f=[values.x,values.z],s=[-1.8,-2.2],c=[1.2,-2.3];return [Math.hypot(f[0]-s[0],f[1]-s[1]),Math.hypot(f[0]-c[0],f[1]-c[1]),Math.hypot(s[0]-c[0],s[1]-c[1])];}
export function objectQuality(room,id,values){
 const def=OBJECTS[room]?.find(o=>o.id===id);if(!def||!values)return 0;
 if(def.clean)return new Set((Array.isArray(values.cleaned)?values.cleaned:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<3)).size/3;
 let quality;
 if(room==='kitchen'&&id==='fridge')quality=kitchenDistances(values).reduce((sum,d)=>sum+suitability(d,[1.2,3.1],0,6),0)/3;
 else quality=def.controls.reduce((sum,c)=>sum+(c.type==='choice'?(values[c.key]===c.ideal?1:0):suitability(values[c.key],c.ideal,c.min,c.max)),0)/def.controls.length;
 if(def.activity&&(!values.practiced||!controlsReady(def,values)))quality=Math.min(quality,.7);
 if(def.activity==='carry'&&!values.delivered)quality=Math.min(quality,.7);
 return clamp(quality,0,1);
}
export function controlsReady(def,values){return (def.controls||[]).every(c=>c.type==='choice'?values[c.key]===c.ideal:values[c.key]>=c.ideal[0]&&values[c.key]<=c.ideal[1]);}
export function evaluateRoom(room,values){
 const tasks=OBJECTS[room].map(def=>{const q=objectQuality(room,def.id,values[def.id]);return {id:def.id,quality:q,done:q>=.8&&(!def.activity||(values[def.id].practiced&&controlsReady(def,values[def.id])))&&(def.activity!=='carry'||values[def.id].delivered===true),weight:def.weight,metric:def.metric};});
 const score=Math.round(tasks.reduce((sum,t)=>sum+t.quality*t.weight,0));
 const metrics=[0,1,2].map(m=>{const ts=tasks.filter(t=>t.metric===m);return Math.round(ts.reduce((s,t)=>s+t.quality*t.weight,0)/ts.reduce((s,t)=>s+t.weight,0)*100);});
 return {score,metrics,tasks,done:tasks.filter(t=>t.done).length,canComplete:score>=80&&tasks.every(t=>t.done)};
}
export function completeRoom(state){const room=ROOMS[state.current];const result=evaluateRoom(room.id,state.rooms[room.id]);if(!result.canComplete)return {ok:false,reward:0};const first=!state.completed.includes(room.id);if(first){state.completed.push(room.id);state.xp+=room.reward;}state.best[room.id]=Math.max(state.best[room.id]||0,result.score);return {ok:true,reward:first?room.reward:0,score:result.score};}
export function isUnlocked(state,index){
 if(!Number.isInteger(index)||index<0||index>=ROOMS.length)return false;
 if(index===0||ROOMS[index].id==='outdoor')return true;
 if(ROOMS[index].id==='workshop'&&state.completed.includes('workshop'))return true;
 return ROOMS.slice(0,index).every(r=>state.completed.includes(r.id));
}
export function sanitizeSave(raw){
 const state=newGame();if(!raw||![2,3].includes(raw.version))return state;
 const completed=Array.isArray(raw.completed)?raw.completed:[];
 for(const room of ROOMS)for(const def of OBJECTS[room.id]){
  const v=raw.rooms?.[room.id]?.[def.id];if(!v||typeof v!=='object')continue;const dest=state.rooms[room.id][def.id];
  if(def.clean){dest.cleaned=Array.isArray(v.cleaned)?[...new Set(v.cleaned.filter(n=>Number.isInteger(n)&&n>=0&&n<3))]:[];continue;}
  for(const c of def.controls){if(typeof v[c.key]!=='number'||!Number.isFinite(v[c.key]))continue;dest[c.key]=c.type==='choice'?(v[c.key]>=0&&v[c.key]<c.options.length&&Number.isInteger(v[c.key])?v[c.key]:dest[c.key]):clamp(v[c.key],c.min,c.max);}
  // Completed legacy offices did not expose a desk-height setting.
  if(raw.version===2&&room.id==='office'&&def.id==='chair'&&v.deskHeight===undefined&&completed.includes('office'))dest.deskHeight=73;
  if(def.activity)dest.practiced=v.practiced===true&&controlsReady(def,dest);
  if(def.activity==='carry')dest.delivered=v.delivered===true&&dest.practiced;
  if(def.layout&&Number.isFinite(v.rotation))dest.rotation=((v.rotation%360)+360)%360;
 }
 for(const r of ROOMS){
  const saved=raw.placements?.[r.id];if(!saved||typeof saved!=='object')continue;
  state.placements[r.id]={};
  for(const [id,placement] of Object.entries(saved).slice(0,200)){
   if(!/^[a-z][a-z0-9-]{0,45}$/.test(id)||!Array.isArray(placement?.offset)||placement.offset.length!==3||!placement.offset.every(n=>Number.isFinite(n)&&Math.abs(n)<120)||!Number.isFinite(placement.rotation))continue;
   state.placements[r.id][id]={offset:[...placement.offset],rotation:placement.rotation%(Math.PI*2)};
  }
 }
 if(raw.cooking){state.cooking={on:false,handle:raw.cooking.handle===1?1:0,stirred:raw.cooking.stirred===true,served:raw.cooking.served===true};}
 // Indoor prerequisites stay ordered. Outdoor completion can occur at any time;
 // completed legacy workshops retain access when the new outdoor area is added.
 for(const room of ROOMS){
  if(!completed.includes(room.id))continue;
  const prerequisites=room.id==='outdoor'?[]:room.id==='workshop'?['office','kitchen','home']:ROOMS.slice(0,ROOMS.indexOf(room)).map(r=>r.id);
  if(!prerequisites.every(id=>state.completed.includes(id)))continue;
  state.completed.push(room.id);state.xp+=room.reward;
  const best=Number(raw.best?.[room.id]);state.best[room.id]=clamp(Number.isFinite(best)&&best>0?best:80,80,100);
 }
 state.completed.sort((a,b)=>completed.indexOf(a)-completed.indexOf(b));
 const current=raw.version===2&&raw.current===3?4:raw.current;
 state.current=isUnlocked(state,current)?current:raw.version===2&&raw.current===3?3:0;
 if(raw.settings){state.settings.quality=['auto','low','high'].includes(raw.settings.quality)?raw.settings.quality:'auto';const sensitivity=Number(raw.settings.sensitivity);state.settings.sensitivity=clamp(Number.isFinite(sensitivity)&&sensitivity>0?sensitivity:1,.3,2);state.settings.sound=raw.settings.sound===true;state.settings.labels=raw.settings.labels!==false;state.settings.tutorialCompleted=raw.settings.tutorialCompleted===true;}
 if(raw.onboarding){state.onboarding.completed=raw.onboarding.completed===true;state.onboarding.skipped=!state.onboarding.completed&&raw.onboarding.skipped===true;}
 return state;
}
