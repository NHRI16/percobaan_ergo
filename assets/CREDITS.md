# Aset visual ErgoFlip

Paket awal berisi **12 tekstur PBR 1K dan satu model GLB**, total **10,69 MiB**. Aset pada tabel pertama berlisensi **CC0 1.0**. Model lingkungan Sketchfab berlisensi **CC BY 4.0**; model Female hand mencantumkan **CC BY-NC 4.0** pada metadata berkas aslinya. Semua berkas dimuat secara lokal saat game dimainkan. Sumber dan checksum paket awal dicatat di [manifest.json](./manifest.json).

## Female hand — tangan pemain

- Judul: **Female hand**.
- Pembuat: **deep3dstudio**, [profil pembuat](https://sketchfab.com/deep3dstudio).
- Sumber: [Female hand di Sketchfab](https://sketchfab.com/3d-models/female-hand-3e9b8ad1942048e3a267d92fb1124d46).
- Lisensi yang tercantum dalam metadata GLB pengguna: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
- Berkas asli pengguna: `models sketchfab/female_hand.glb`, dipertahankan tanpa perubahan.
- Perubahan: tekstur diturunkan ke 1K; material lama dikonversi; ukuran diubah ke meter; pasangan kiri dibuat dengan pencerminan; ditambahkan 23 tulang per tangan, bobot kulit pada tiap vertex, dan tujuh klip animasi.
- Hasil: [pasangan tangan bertulang dan beranimasi](models/sketchfab/female-hands-rigged.glb), sekitar **2,68 MiB** dan **16.164 segitiga** untuk kedua tangan. Texture maps dipakai bersama oleh tangan kanan/kiri.
- Klip: `Idle`, `Reach`, `Grip`, `Pinch`, `Stir`, `Clean`, `Release`. Saat bermain, transisi pose dan titik kontak disesuaikan dengan benda yang dipegang.
- Metadata preparasi sumber: [hand-manifest.json](models/sketchfab/hand-manifest.json).

| Aset lokal | Pembuat | Sumber asli | Pemakaian |
| --- | --- | --- | --- |
| `textures/wood_floor/` | Dimitrios Savva / Poly Haven | [Wood Floor](https://polyhaven.com/a/wood_floor) | Lantai dan permukaan kayu |
| `textures/leafy_grass/` | Charlotte Baglioni / Poly Haven | [Leafy Grass](https://polyhaven.com/a/leafy_grass) | Rumput halaman |
| `textures/plaster_grey_04/` | Rob Tuytel / Poly Haven | [Plaster Grey 04](https://polyhaven.com/a/plaster_grey_04) | Detail plester dinding |
| `textures/concrete_floor_worn_001/` | Dimitrios Savva (fotografi), Rico Cilliers (pemrosesan) / Poly Haven | [Concrete Floor Worn 001](https://polyhaven.com/a/concrete_floor_worn_001) | Beton dan jalur luar rumah |
| `models/sheen-chair.glb` | Eric Chadwick / Wayfair LLC, 2020 | [Sheen Chair, Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair) | Kursi dekoratif dengan kain, kayu, dan detail logam |

Tekstur memakai tiga saluran: warna diffuse dalam sRGB, normal OpenGL dalam linear, dan roughness dalam linear. JPG 1K asli dipertahankan; tidak ada upscale atau tekstur yang diklaim sebagai foto jika dibuat prosedural. Geometri ruang dan peralatan yang dapat diatur tetap dibuat oleh game.

Lisensi aset Poly Haven memperbolehkan penggunaan dan redistribusi termasuk komersial: [lisensi penerbit](https://polyhaven.com/license), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Lisensi kursi tercantum pada bagian Legal [README resmi model](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/SheenChair/README.md). Model kursi lokal berasal dari Khronos/Wayfair, bukan Sketchfab.

## Sketchfab

Model berikut berasal dari berkas yang ditambahkan pengguna ke `models sketchfab/`. Atribusi dibaca dari `asset.extras` dalam masing-masing glTF/GLB, serta `license.txt` untuk dapur.

| Model asli | Pembuat | Sumber | Pemakaian di game |
| --- | --- | --- | --- |
| Realistic Tree | [Daniel](https://sketchfab.com/danielpetrov) | [Model](https://sketchfab.com/3d-models/realistic-tree-d989c0f801d847b9a74992ec4ddcfdfc) | Pohon peneduh jalan, halaman, dan pemandangan jendela |
| Pohon (`pohon.glb`) | [praktikumgkv2022](https://sketchfab.com/praktikumgkv2022) | [Model](https://sketchfab.com/3d-models/pohon-60cee0b63e4742d2a904d63609870621) | Pohon berdaun rimbun di kiri dan kanan taman |
| Pohon (`pohon (1).glb`) | [vikanovia28](https://sketchfab.com/vikanovia28) | [Model](https://sketchfab.com/3d-models/pohon-794d4122cec24186b00df68859c480d0) | Pohon ramping di sisi taman |
| modern scandinavian kitchen island | [QuarizonStudio](https://sketchfab.com/QuarizonStudio) | [Model](https://sketchfab.com/3d-models/modern-scandinavian-kitchen-island-a9738f4e651b4779acdddcfbb89516f6) | Kabinet dapur, oven, dan lampu gantung |
| Modern Apartment | [Visthétique](https://sketchfab.com/visthetique) | [Model](https://sketchfab.com/3d-models/modern-apartment-1fbb649cd6624f2bb7b7d6e30c6533a5) | Kulkas, mesin kopi, dan sofa |

Kelima model berlisensi [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). ErgoFlip memakai karya turunan: bagian furnitur dipisahkan, tekstur dibatasi hingga 1024 piksel, material daun lama dikonversi ke metallic-roughness dengan alpha mask, serta skala dan posisi disesuaikan dengan ruangan. Geometri pohon digabung menurut material ketika dimuat. Berkas asli tetap utuh.

Salinan untuk game ada di `assets/models/sketchfab/`, dengan sumber, nama pembuat, ukuran, jumlah segitiga, dan SHA-256 dalam [manifest model](models/sketchfab/manifest.json). Game memuat bagian yang diperlukan; berkas apartemen asli 299 MB tidak dimuat oleh pemain. Untuk membuat ulang salinan lokal, jalankan `npm run assets:prepare` (memerlukan Chrome dan semua berkas sumber lokal).

[sketchfab-catalog.json](./sketchfab-catalog.json) berisi kandidat dari halaman pembuat resmi: meja, kursi kantor, monitor, lampu, kulkas, sink, sapu, dan bangku taman. Kandidat tersebut **belum disertakan sebagai berkas model**. Halaman sumber menampilkan status dapat diunduh dan lisensi CC Attribution ketika diperiksa; periksa kembali lisensi saat mengunduh.

[Dokumentasi Download API resmi Sketchfab](https://sketchfab.com/developers/download-api/downloading-models) mensyaratkan pengguna masuk dengan akun Sketchfab untuk meminta unduhan. Sesi pengembangan ini tidak memiliki autentikasi tersebut. Tidak ada aset viewer yang diekstrak dan tidak ada kredensial yang disimpan di game.

Alur impor untuk aset yang sudah diunduh secara sah:

1. Buka tautan kandidat dan unduh menggunakan akun sendiri. Simpan nama pembuat, judul, tautan model, dan lisensinya.
2. Pilih format GLB mandiri. Untuk glTF dengan berkas `.bin` dan tekstur terpisah, simpan seluruh dependensi bersama atau ekspor sebagai GLB dari Blender.
3. Gunakan menu impor model game. Model statis mengganti tampilan objek; parameter dan skor ergonomi tetap menggunakan data simulasi.
4. Saat membagikan game dengan model CC BY, sertakan atribusi pembuat, sumber, tautan lisensi, dan keterangan perubahan. Batasi tekstur ke 1K–2K untuk perangkat mobile.

## Mengunduh ulang aset bawaan

Jalankan dari folder proyek:

```sh
node scripts/download-assets.mjs
```

Script hanya menggunakan endpoint penerbit yang dicantumkan pada manifest. Tekstur divalidasi dengan checksum MD5 penerbit; manifest juga menyimpan SHA-256. GLB diperiksa header format glTF 2. Unduhan ini hanya dibutuhkan pengembang untuk memulihkan aset lokal yang hilang, bukan oleh pemain.
