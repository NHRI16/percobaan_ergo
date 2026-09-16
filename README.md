# ErgoFlip

Game web simulasi edukasi ergonomi 3D dengan gameplay inspeksi, penataan, bersih-bersih, dan eksplorasi halaman. Dibangun dengan Three.js, JavaScript, dan WebXR. Antarmuka dan materi pembelajaran berbahasa Indonesia.

Penyempurnaan terbaru memasang model Sketchfab lokal: tiga jenis pohon, kabinet dan lampu dapur Scandinavian, serta kulkas, mesin kopi, dan sofa dari Modern Apartment. Pohon mengisi taman, jalan, dan pemandangan jendela; furnitur tetap mengikuti pengaturan ergonomi. Tutorial interaktif, menu Esc, misi outdoor, dan progres lama tetap didukung.

Area outdoor kini berupa **lingkungan fiktif bergaya modern Menteng**: rumah utama dua lantai, halaman dengan kolam taman dan pergola, gerbang geser, serta lima rumah besar tetangga di sepanjang jalan berpohon. Area jelajah berukuran 114 × 87 meter; bangunan, pagar, dan kolam memiliki batas tabrakan. Rumah tetangga dapat didekati melalui pekarangannya; interior permainan tetap berada di rumah utama.

## Jalankan

Gunakan Node.js 20 atau lebih baru. Dari folder proyek:

```bash
npm install
npm run dev
```

Buka **http://localhost:5173**. Semua aset bawaan, ikon, dan modul 3D tersedia lokal; gameplay tidak memerlukan CDN atau layanan berbayar setelah dependensi terpasang. Jangan membuka `index.html` langsung melalui `file://` karena modul memerlukan HTTP.

Untuk mencoba di ponsel pada Wi-Fi yang sama, buka `http://ALAMAT-IP-KOMPUTER:5173`. Firewall komputer perlu mengizinkan server Node. WebXR memerlukan HTTPS pada browser headset, atau localhost untuk pengembangan.

**Mobile dimainkan horizontal.** Putar ponsel ke samping: joystick berada di kiri, area usap kamera di kanan, dan tombol tindakan berubah mengikuti objek. Tombol layar penuh mencoba mengunci orientasi; bila browser tidak mendukungnya, gunakan rotasi otomatis perangkat. Dua jari dapat menggerakkan pemain dan kamera bersamaan. Saat ponsel diputar tegak atau aplikasi kehilangan fokus, input gerak dihentikan.

## Gameplay

Pada kunjungan pertama, pilih **Main Tutorial** atau **Langsung Main**. Tutorial meminta pemain benar-benar berjalan, melihat, memeriksa kursi, menyesuaikan kursi/meja, membersihkan noda, lalu keluar rumah. Tombol Lanjut terbuka setelah tindakan dilakukan. Tutorial dapat diakhiri kapan saja dan diulang melalui menu Esc.

1. **Kantor Fokus:** atur tinggi kursi, sandaran, dan meja; tepi atas monitor dan jarak pandang; jangkauan keyboard, pencahayaan, dan kebersihan.
2. **Dapur Mengalir:** sesuaikan meja, geser kulkas untuk memperbaiki jarak segitiga kerja, atur rak, lapangkan jalur troli, dan bersihkan tumpahan.
3. **Rumah Nyaman:** pilih panjang gagang dan postur, praktikkan menyapu dan mengepel, angkat kotak ke meja, geser sofa, dan tuntaskan pembersihan.
4. **Halaman:** pilih postur dan bawa kotak 5 kg ke meja taman, sesuaikan meja tanam, geser penghalang jalur, arahkan lampu, dan singkirkan sampah jalan setapak. Halaman bebas dikunjungi sejak awal melalui pintu.
5. **Studio Kreatif (bonus):** sesuaikan meja, jangkauan alat, lampu, posisi troli, dan kebersihan lantai.

Lima jenis ergonomi yang menyatu dalam game adalah kantor, mobile/VR, dapur, rumah tangga, dan outdoor. Mobile/VR adalah mode bermain untuk seluruh lokasi. Studio lama dipertahankan sebagai bonus: total **25 misi di 5 area**. Semua misi dan skor **minimal 80%** diperlukan untuk menyelesaikan proyek. Kantor → dapur → rumah menjadi alur utama; halaman bebas dijelajahi sejak awal; studio bonus terbuka setelah proyek utama selesai. Reward: 250, 350, 450, 500, dan 550 XP (**total 2.100 XP**); masing-masing hanya dapat diklaim sekali.

**Keluar rumah:** temukan pintu lalu tekan F. Tombol “Ke halaman” membantu mendekati pintu; F tetap digunakan untuk membuka. Di halaman, pintu masuk membawa pemain kembali ke ruangan asal.

**Keluar pagar:** berjalan ke gerbang atau klik **Jelajahi lingkungan**, arahkan crosshair ke gerbang/panel, lalu tekan **F**. Gerbang bergeser dan membuka jalan ke trotoar, jalan, dan pekarangan rumah tetangga. Panel bisa digunakan dari kedua sisi untuk menutup atau membuka gerbang. Tahan **Shift** saat berjalan di luar untuk berlari; tombol **Kembali ke rumah** membantu menemukan pintu masuk. Gerbang kembali tertutup saat area dimuat ulang.

**Membawa barang:** pilih posisi beban dekat tubuh, klik Angkat & bawa kotak, lalu berjalan ke penanda hijau. Meletakkan hanya berhasil saat berjarak maksimal 1,8 m dari tujuan. Pilihan postur saja tidak menyelesaikan misi. Bawaan dapat dibatalkan dan tidak menghilang saat berganti mode.

Skor menggunakan bobot yang berjumlah 100, dihitung ulang dari nilai pengaturan aktual. Perhitungan dapur menggunakan jarak antara titik akses peralatan, bukan preset skor. Aktivitas rumah memerlukan praktik setelah pengaturan postur sesuai. Hijau ≥ 80; kuning 50–79; merah < 50. Angka ini adalah indikator latihan, bukan sertifikasi ruang kerja.

## Kontrol

### Tangan, pindah barang, dan memasak

Tangan pemain sekarang menggunakan **model Female hand milik pengguna**. Pasangan kanan/kiri memiliki 23 tulang masing-masing, termasuk ruas kelima jari. Animasi membedakan tangan rileks, meraih, menggenggam, menjepit, menekan kontrol, mengaduk, membersihkan, dan melepas. Pergelangan mengikuti titik kontak sendok/gagang panci; genggaman barang kecil memakai pose jepit. Transisi pose dan gerak saat berjalan dihaluskan.

Model siap pakai ada di `assets/models/sketchfab/female-hands-rigged.glb`, termasuk tujuh klip animasi. Berkas asli `models sketchfab/female_hand.glb` tetap utuh. Metadata aslinya mencantumkan **CC BY-NC 4.0**; atribusi dan perubahan tercatat di [CREDITS](assets/CREDITS.md). Jika pemuatan model gagal, game tetap memakai tangan dasar yang bisa berinteraksi.

Untuk membangun ulang setelah mengganti model sumber atau rig:

```bash
npm run assets:hand-textures
npm run assets:hand-rig
```

Script memerlukan Chrome lokal. Penempatan tulang dibuat khusus untuk scan ini; mengganti bentuk/model sumber memerlukan penyesuaian landmark pada `src/hand-rig.js`. Hasil pratinjau pose tersimpan di `artifacts/female-hands-calibration.png`.

- **Barang → pilih objek → Angkat / pindahkan:** bawa atau geser furnitur, buku, pot, bingkai, toples, mesin kopi, talenan, dan perlengkapan ruangan. Tangan kiri/kanan terlihat saat berjalan, meraih, membawa, dan mengaduk.
- Saat membawa, arahkan pandangan ke tempat tujuan. Bingkai hijau menandai tempat tersedia; merah menandai benturan. Barang kecil dapat diletakkan di atas permukaan furnitur. **R** memutar 45°, **F** meletakkan, **X** membatalkan. Mobile menyediakan tombol **Putar**, **Batal**, dan **Letakkan** di kanan.
- Isi lemari ikut bersama lemarinya; monitor, keyboard, lampu, dan perlengkapan meja ikut saat meja kantor dipindah. **Kembalikan posisi awal** tersedia pada pengaturan objek. Posisi tersimpan setelah diletakkan; membatalkan mengembalikan barang ke posisi sebelumnya.
- Dinding, lantai, bangunan, vegetasi tanah, dan kendaraan lingkungan menjadi bagian tetap peta. Fitur pindah berlaku pada furnitur dan perlengkapan yang terdaftar di **Barang**.
- **Dapur → Meja dapur / Kompor & sup sayur:** atur meja ke 88–94 cm, arahkan gagang panci ke samping, nyalakan kompor, aduk sup, lalu **Matikan & sajikan**. Api, uap, sendok, dan tangan mengikuti aktivitas. Kompor yang menyala harus dimatikan sebelum dipindah; pemuatan ulang atau pindah ruangan mematikannya.
- Memasak adalah aktivitas tambahan; jumlah misi karier dan total reward tetap 25 misi / 2.100 XP. Pilihan ergonomi pada panel tetap digunakan untuk penilaian latihan.

| Perangkat | Kontrol |
| --- | --- |
| Desktop | WASD / panah untuk bergerak; klik **Jelajahi ruangan** untuk mouse look; klik-seret sebagai alternatif |
| Interaksi | Arahkan crosshair lalu tekan **F**, dalam jarak 3,5 m; objek yang tertutup tidak dapat dipilih menembus furnitur |
| Alat | **1** Inspeksi, **2** Sesuaikan, **3** Bersihkan, **4** Tata ruang |
| Navigasi | **Esc** membuka menu dan melepas kursor; **Tab** membuka perjalanan proyek; **H** membuka panduan |
| Jalur cepat | Klik misi atau penanda objek untuk mendekat dan membuka pengaturan |
| Mobile horizontal | Joystick kiri; usap sisi kanan untuk kamera; tombol kanan untuk periksa, bersihkan, buka, atau letakkan; tahan **Lari** di luar |
| VR | Laser controller + trigger untuk objek/tombol; stik kiri bergerak; stik kanan berputar 30°; grip memanggil panel |

Panel VR berada di dunia 3D dan mendukung pengaturan plus/minus, pembersihan, latihan, klaim reward, pergantian proyek, dan keluar VR. Tombol VR menampilkan penjelasan bila perangkat tidak mendukung sesi imersif.

## Penyimpanan dan pengaturan

- Progres, XP, pilihan tutorial, pengaturan objek, kualitas grafis, dan sensitivitas disimpan di `localStorage` browser dengan kunci `ergoflip-save-v2`. Nama kunci dipertahankan; format data kini versi 3 agar progres lama tetap ditemukan.
- Mode grafis otomatis memilih resolusi terbatas dan menonaktifkan bayangan pada perangkat sentuh; mode tinggi menyediakan pencahayaan dan bayangan tambahan.
- Hanya satu ruangan dimuat sekaligus; geometri dan tekstur prosedural digunakan ulang. Kecepatan frame tetap bergantung pada GPU dan browser.
- Tombol **Mulai ulang progres** meminta konfirmasi di dalam game sebelum menghapus progres.
- Impor `.GLB` atau paket `.gltf` lokal opsional, maksimal 25 MB total. Untuk glTF, pilih `.gltf`, `.bin`, dan seluruh tekstur bersama-sama; nama berkas dalam paket harus unik. Referensi yang tidak ada di paket ditolak. Impor tidak mengunggah berkas dan kegagalan mempertahankan objek lama. Model serta atribusi impor hanya bertahan selama ruangan aktif.

## Aset dan kualitas visual

- **12 peta PBR 1K asli Poly Haven:** kayu, rumput, plester, beton, masing-masing warna, normal, dan roughness.
- **Model SheenChair Wayfair/Khronos GLB:** kursi dekoratif realistis dengan material kain, digunakan di kantor dan rumah.
- Detail tambahan: vegetasi dengan instancing, rumah dengan pintu, pagar, jalan setapak, meja taman, jendela, soket, radiator, dan detail furnitur.
- Paket PBR dan kursi awal berukuran **10,69 MiB**, berlisensi CC0. Model lingkungan Sketchfab berlisensi CC BY 4.0; Female hand mencantumkan CC BY-NC 4.0. Sumber serta perubahan dicatat di [CREDITS](assets/CREDITS.md) dan [manifest model Sketchfab](assets/models/sketchfab/manifest.json).
- Folder `models sketchfab/` menyimpan unduhan asli pengguna. `npm run assets:prepare` membuat salinan di `assets/models/sketchfab/`: tekstur maksimal 1K, material daun kompatibel, dan potongan furnitur dari apartemen. Berkas apartemen 299 MB tidak diunduh oleh browser saat bermain. Script memerlukan Chrome lokal untuk mengolah tekstur.
- Model dimuat sesuai ruangan dan dipakai ulang dari cache. Pohon berbagi geometri yang digabung per material; model yang gagal dimuat mempertahankan tampilan dasar. Pergantian ruangan saat pemuatan berlangsung tidak menambahkan model ke ruangan yang salah.
- Semua sumber game lokal; tidak ada token Sketchfab dalam proyek. Menu **Model 3D & sumber aset** memuat informasi model terpasang dan tautan atribusi. Impor furnitur lain tetap tersedia.

Target GTA V merupakan arah kualitas visual, **belum kesetaraan grafis AAA**. Geometri interaktif masih memakai model prosedural yang mudah disesuaikan, dilengkapi tekstur foto dan model berlisensi. Kualitas, kelancaran mobile, dan kenyamanan VR tetap bergantung pada perangkat; tersedia pilihan grafis ringan.

## Materi edukasi

Game menggunakan klien fiktif: tinggi 170 cm, tinggi lipat lutut 46 cm, mata duduk 120 cm, dan siku berdiri 102 cm. Rentang angka, cahaya, jalur, dan bobot skor disederhanakan untuk gameplay. Penilaian postur berdasarkan pengaturan dan pilihan pemain, bukan pelacakan tubuh atau pengukuran lux sensor. Kebutuhan tubuh dan tugas nyata dapat berbeda.

Prinsip umum dirujuk dari:

- [OSHA — Computer Workstations](https://www.osha.gov/etools/computer-workstations): layar setinggi / sedikit di bawah mata, kaki tersangga, posisi kerja nyaman.
- [Oregon OSHA — Ergonomics: Computer Workstations](https://osha.oregon.gov/OSHAPubs/checklists/ergonomics-workstations.pdf): checklist penataan kerja.
- [HSE — Good Handling Technique](https://www.hse.gov.uk/msd/manual-handling/good-handling-technique.htm): beban dekat tubuh, posisi stabil, gerak terkendali, dan menghindari putaran pinggang.

## Validasi

```bash
npm test
npm run test:e2e
```

`npm test` memeriksa skor, jarak dapur, latihan postur, pengantaran outdoor, migrasi penyimpanan, unlock, dan reward berulang. `npm run test:e2e` menggunakan Chrome yang terpasang untuk memeriksa karier melalui UI, tutorial, F dan gerakan, impor model, fallback VR, serta rotasi mobile dari 390 × 844 ke 844 × 390 dan kontrol sentuh. Tes Sketchfab mencakup model terpasang, ukuran furnitur, penyesuaian tinggi dan posisi, kunjungan ulang, serta fallback ketika berkas gagal dimuat. Konfigurasi tes ada di `playwright.config.js`; ubah `channel` bila memakai browser lain.

Tes simulasi tambahan memeriksa posisi pangkal pohon, kontak monitor/keyboard dengan meja, barang yang ikut saat meja dipindah, putar/batal/letakkan, penyimpanan posisi, dan urutan memasak. Tes mobile memakai sentuhan simultan untuk joystick/kamera serta tombol pindah barang pada layar horizontal. Gambar hasil pengujian berada di `test-results/`, termasuk `mobile-hands-preview.png` dan `cooking-hands-preview.png`.

Tes lingkungan Menteng mencakup gerbang tertutup yang menghalangi pemain, membuka/menutup dari kedua sisi, berjalan ke rumah seberang melalui bukaan pagar, dan kembali ke rumah utama. Kontrol gerbang juga diuji dengan input sentuh. Untuk membuat pratinjau rumah dan jalan, jalankan server lalu `node tests/menteng-preview.mjs`; gambar tersimpan di `test-results/`.

VR fisik dan performa pada ponsel nyata memerlukan pengujian perangkat. Pengujian otomatis tidak membuktikan frame rate pada semua ponsel atau headset.

## Struktur

```text
index.html              Antarmuka game
styles.css              HUD, inspector, responsivitas mobile
mobile.css              Tata letak horizontal dan panduan rotasi
simulation.css          Daftar barang, kontrol pindah, dan aktivitas dapur
src/app.js              Gameplay, kontrol, penyimpanan, WebXR
src/mobile.js           Joystick, multitouch, reset input, orientasi
src/hands.js            Tangan pemain dan animasi meraih / membawa
src/hand-rig.js         Tulang, bobot kulit, pencerminan dan titik kontak jari
src/hand-poses.js       Pose jari bersama untuk game dan ekspor animasi GLB
src/moving.js           Pengangkatan, pratinjau penempatan, tabrakan, rotasi
src/cooking.js          Panci, api, uap, sendok, dan animasi memasak
src/world.js            Scene, furnitur, material, collision, raycast
src/neighborhood.js     Rumah modern Menteng, taman luas, jalan dan rumah tetangga
src/tutorial.js         Tutorial interaktif opsional
src/assets.js           Loader material PBR dan model lokal berlisensi
src/rules.js            Definisi misi dan penilaian ergonomi
src/icons.js            Ikon SVG lokal
server.js               Server HTTP lokal
tests/                  Pengujian aturan dan browser
assets/prototype-original.html  Prototipe awal yang dipertahankan
```
#   p e r c o b a a n _ e r g o  
 