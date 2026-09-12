# Checkmate-64

PRD'nin donanımdan bağımsız geliştirme ortamı: 64 sensörlü tahta simülatörü, yerel WebSocket sunucusu ve WebView uyumlu mobil istemci.

## Çalıştırma

Node.js 22.12+ gerektirir.

```sh
npm install
npm run dev
```

Arayüz: http://localhost:5173 · Tahta soketi: ws://localhost:8080

```sh
npm test
npm run build
```

Geliştirme sunucusu açıkken, yüklü Chrome ile uçtan uca kontrol: `npm run test:browser`. Ekran görüntüleri `test-results/` altına yazılır.

`dist/` mobil WebView paketlemesinde kullanılabilecek statik çıktıdır. Stockfish JS/WASM dosyaları kurulum ve build sırasında yerel olarak kopyalanır. Motor çalışırken harici servise pozisyon gönderilmez. Google Fonts kullanılamadığında sistem fontları devreye girer.

## Kullanım

1. Board Lab'de bağlantının kurulmasını bekleyin. İki oyuncu veya Stockfish (siz beyaz) seçin.
2. Oyunu başlatın. Sol simülatörde sol tık taşı kaldırır, sağ tık elde seçili taşı boş kareye yerleştirir. Birden fazla taş kaldırılabilir; eldeki taşlar arasından yerleştirilecek taşı seçin. Telefonda Pick up / Place düğmeleriyle işlem seçip kareye dokunun. Klavyede Enter kaldırır, P yerleştirir. Sağdaki mobil tahta salt okunurdur ve yalnızca doğrulanmış konumu gösterir.
3. Taş yerleşiminin 400 ms durulmasından sonra hamle doğrulanır. Taş yemede hem kaynak hem hedef taşını kaldırıp hedefi yeniden doldurun. Kaldırma sırası serbesttir.
4. Stockfish siyahın hamlesini LED'lerle gösterir. Bu hamleyi simülatörde fiziksel olarak uygulayın; motor tahtayı otomatik değiştirmez.
5. Hatalı hamlede kırmızı LED'leri izleyerek son geçerli konuma dönün. Saat işlemeye devam eder. Bağlantı kopunca saatler duraklar; yeniden bağlandığında konumu eşleştirip başlatın.
6. Özel pozisyon için FEN yükleyin. Terfiden önce terfi taşını seçin. Rokta şah ve kaleyi; geçerken almada alınan piyonu da taşıyın.
7. İki sütunun altında protokol konuşması bulunur: tahta durumları solda, mobil uygulamanın LED komutları sağda görünür. Sunucudan alınan her mesaj bir defa gösterilir. Telefonda http://homelab:5173 adresini ve ws://homelab:8080 soketini kullanın. Aynı oyunu yalnızca **bir aktif kural/saat istemcisi** yönetmelidir.

## Mimari

- `src/protocol.js`: LERF bitboard (a1=0, h8=63), tam uzunlukta hex ve mesaj doğrulama.
- `server/index.js`: mevcut doluluk/LED durumunu tutan I/O sunucusu; satranç kuralı içermez. Yeni bağlantıya anlık durum yollar. Simülatörün yayınladığı sensör durumunu tüm istemcilere iletir.
- `src/fsm.js`: chess.js yasal ardıl pozisyonlarıyla doluluğu eşleştirir; capture için sensör kaldırma kanıtı arar; rok/geçerken almayı tamamlanana kadar bekletir.
- `src/clock.js`: geçen gerçek süreyi kullanan çift saat.
- `src/engine.js`: Stockfish 18 lite single-thread WASM Web Worker, UCI, zaman aşımı ve iptal.

## Protokol

```json
{"event":"board_state","data":{"state":"0xFFFF00000000FFFF","timestamp":1772839201948}}
{"cmd":"set_leds","data":{"mask":"0x0000000000000010","color":"#00FF00","mode":"solid"}}
```

Her LED komutu önceki LED görünümünü değiştirir. `clear` tüm LED'leri kapatır. Sunucu 4 KB üzeri mesajları reddeder. Yerel geliştirme sunucusu kimlik doğrulaması içermez; internete yayınlamak için tasarlanmamıştır.

## Donanım ve ürün sınırları

Sprint 1–3 yazılım akışı bu projede uygulanır. Sprint 4 ESP32 pin eşlemesi, elektrik tasarımı, firmware ve gerçek breadboard doğrulaması henüz yapılmadı. Capacitor/Cordova native projeleri ve mağaza paketleri henüz oluşturulmadı. HTTPS WebView ortamında `ws://` karma içerik kısıtları ve native yerel ağ izinleri paketleme aşamasında ele alınmalıdır.

Doluluk sensörü taş kimliği/rengini göremez. FEN bilgisi ve kullanıcı doğru yerleşimi gereklidir. Hiçbir sensörün aradaki boşluğu göremediği taş yemeler kesin olarak çözülemez. Rokta önce yalnız kaleyi normal yasal hamle gibi taşıyıp beklemek belirsizdir; şahı önce hareket ettirin veya tüm hareketi aynı 400 ms pencerede tamamlayın. Bağlantı kesilirken yapılan hamleler otomatik tahmin edilmez.

BOM ve satış fiyatları PRD hedefleridir; tedarik, güç bütçesi, güvenlik/sertifikasyon, üretim ve satış maliyetleri doğrulanmamıştır.

## Kaynaklar / lisanslar

- chess.js 1.4.0: BSD-2-Clause — https://github.com/jhlywa/chess.js
- Stockfish.js 18.0.8: GPL-3.0 — https://github.com/nmrugg/stockfish.js/tree/v18.0.8
- Stockfish kaynak / derleme yönergeleri: https://github.com/nmrugg/stockfish.js

Stockfish dağıtımında GPL lisansı, ilgili kaynak kodu ve bildirim yükümlülükleri korunmalıdır. Bu depo ticari dağıtımın lisans değerlendirmesini tamamlamaz.
