# Kolaysa Sen Bul

Heardle/Hitster tarzı, arkadaşlarınla oda kurup oynayabildiğin gerçek zamanlı müzik tahmin oyunu. Şarkının çok kısa bir kesiti çalınır, 6 hakkın var — her hakta ya tahmin edersin ya da pas geçersin, pas geçtikçe kesit uzar.

## Kurulum

```bash
npm install
npm start
```

Sunucu `http://localhost:3000` adresinde çalışır.

## Arkadaşlarla oynama

Aynı ev/ofis ağındaysanız: bilgisayarının yerel IP adresini bul (`ipconfig` → IPv4 Address) ve arkadaşların `http://<senin-ip-adresin>:3000` adresine girsin.

Farklı ağlardaysanız, ücretsiz bir servise (Render.com gibi) deploy etmen gerekir.

## Nasıl oynanır

1. Bir kişi "Oda Kur" der, oluşan kodu diğerleriyle paylaşır.
2. Diğerleri "Odaya Katıl" ile kodu girer.
3. Host "Oyunu Başlat" der.
4. Her round'da kısa bir şarkı kesiti çalar. Şarkı adını arama kutusuna yaz, listeden seç, "Tahmin Et" veya "Pas" bas.
5. Erken hakta doğru bilmek daha çok puan kazandırır.
6. 10 round sonunda en çok puanı toplayan kazanır.
