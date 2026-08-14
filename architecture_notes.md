# Архітектурні нотатки

## Підтверджено
Caster.fm використовує Icecast-сумісну source connection. Для цього проєкту задані host `morcast.caster.fm`, port `16855`, username `source`, mount point `/WLtAP`, і максимальний bitrate 96 kbps. Пароль не зберігається в репозиторії.

## Android requirements
Потрібен foreground service, щоб трансляція продовжувалася при заблокованому екрані. На Xiaomi/Android 15 користувачеві також потрібно дозволити автозапуск і зняти battery optimization для надійної 24/7 роботи.

## Expo limitation
`expo-audio` підходить для простого локального відтворення, але документація прямо радить складніші бібліотеки для streaming/real-time processing. Вибір папки доступний через новий `expo-file-system` `Directory.pickDirectoryAsync()` на Android, а пароль можна зберігати через `expo-secure-store`.

## Streaming options
1. Нативний Android encoder/source client: найнадійніший шлях для MP3/codec, foreground service, reconnect і Icecast metadata; потребує custom native Android code та власного APK/development build.
2. FFmpeg-based native bridge: може декодувати різні формати і кодувати MP3 96 kbps, але має великий native dependency, складніший build і підвищене споживання батареї.
3. Спрощений MVP: напряму передавати лише MP3-файли як Icecast source без перекодування; менше функцій, але стабільніше для першої перевірки. Інші формати додати після підтвердження end-to-end трансляції.

## External sources
- https://www.caster.fm/help/cloud/api-documentation/api-requests/
- https://www.caster.fm/
- https://icecast.org/
- https://github.com/fatihsokmen/android-icecast-broadcast
- https://docs.expo.dev/versions/v54.0.0/sdk/audio/
