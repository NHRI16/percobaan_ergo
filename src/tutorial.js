import { icon } from './icons.js';

const STEPS = [
  { title:'Ambil langkah pertama', text:'Tekan WASD untuk berjalan. Di ponsel, geser joystick kiri. Coba berjalan sedikit di ruangan.', event:'move', hint:'Berjalan setidaknya 35 cm.' },
  { title:'Lihat ruangan di sekitar Anda', text:'Klik Jelajahi lalu gerakkan mouse, atau klik dan seret ruangan. Di ponsel, usap area ruangan.', event:'look', hint:'Gerakkan pandangan ke kiri atau kanan.' },
  { title:'Kenali objek yang bisa diatur', text:'Arahkan crosshair ke kursi. Saat namanya muncul, tekan F. Anda juga bisa mengetuk penanda kursi.', event:'inspect', hint:'Buka pengaturan Kursi kerja.', action:'Tunjukkan kursi', target:'chair' },
  { title:'Sesuaikan dengan tubuh klien', text:'Atur dudukan 44–48 cm, sandaran 100–110°, dan meja 70–76 cm. Gunakan slider di panel objek; lihat skor ikut berubah.', event:'adjust', hint:'Ketiga pengaturan kursi dan meja perlu sesuai.', action:'Buka pengaturan kursi', target:'adjust-chair' },
  { title:'Ruang bersih, langkah lebih aman', text:'Pilih alat Bersihkan (3). Dekati noda, arahkan crosshair, lalu tekan F. Tombol bantuan bisa membawa Anda ke noda.', event:'clean', hint:'Bersihkan satu noda di lantai.', action:'Tunjukkan noda', target:'dirt' },
  { title:'Ada dunia di luar ruangan', text:'Dekati pintu keluar dan tekan F untuk menuju halaman. Di sana Anda bisa membawa barang, menata taman, dan membuka jalur aman.', event:'outdoor', hint:'Keluar ke halaman melalui pintu.', action:'Tunjukkan pintu', target:'exit' }
];

export class Tutorial {
  constructor({ onGuide, onFinish }) {
    this.onGuide=onGuide;this.onFinish=onFinish;this.active=false;this.index=0;this.passed=false;
    this.element=document.createElement('section');this.element.id='tutorial-card';this.element.hidden=true;this.element.setAttribute('aria-label','Tutorial interaktif');
    document.body.appendChild(this.element);
    this.element.addEventListener('click',event=>{
      if(event.target.closest('#tutorial-skip'))this.finish(false);
      if(event.target.closest('#tutorial-guide'))this.onGuide(STEPS[this.index].target);
      if(event.target.closest('#tutorial-next')&&this.passed){if(this.index===STEPS.length-1)this.finish(true);else{this.index++;this.passed=false;this.render();}}
    });
  }
  start(){this.active=true;this.index=0;this.passed=false;this.element.hidden=false;document.body.classList.add('tutorial-active');this.render();}
  event(name){if(this.active&&STEPS[this.index].event===name&&!this.passed){this.passed=true;this.render();}}
  finish(completed){this.active=false;this.element.hidden=true;document.body.classList.remove('tutorial-active');this.onFinish(completed);}
  render(){const step=STEPS[this.index];this.element.innerHTML=`<div class="tutorial-top"><span class="eyebrow">${icon('bulb')} BELAJAR SAMBIL BERMAIN</span><button id="tutorial-skip" title="Akhiri tutorial" aria-label="Akhiri tutorial">${icon('close')}</button></div><div class="tutorial-title"><h2>${step.title}</h2><span>${this.index+1}<small> / ${STEPS.length}</small></span></div><div class="tutorial-progress">${STEPS.map((_,i)=>`<i class="${i<this.index?'done':i===this.index?'current':''}"></i>`).join('')}</div><p>${step.text}</p><div class="tutorial-hint ${this.passed?'passed':''}">${icon(this.passed?'check-circle':'scan')}<span>${this.passed?'Bagus, langkah ini sudah dilakukan.':step.hint}</span></div><div class="tutorial-actions">${step.action?`<button id="tutorial-guide" class="secondary-button">${step.action}</button>`:''}<button id="tutorial-next" class="primary-button" ${this.passed?'':'disabled'}>${this.index===STEPS.length-1?'Selesai tutorial':'Lanjut'} ${icon('arrow-right')}</button></div>`;}
}
