# Simulado ENARE Psico (app)

HTML, CSS e JavaScript sem framework em `www/`, embalado em APK com Capacitor 7. O banco de questões vem de `../banco/`.

## Atualizar o banco e gerar o APK novo

```
cd app
npm run banco && npx cap sync android
cd android && ./gradlew assembleDebug
```

APK: `app/android/app/build/outputs/apk/debug/app-debug.apk`. Mande o arquivo para a estudante, que instala por cima sem perder o progresso (o id da questão nunca muda).

Primeira vez numa máquina nova: `npm install` em `app/` e um `android/local.properties` com `sdk.dir=/caminho/do/Android/Sdk` (arquivo ignorado pelo git).

## Testar no navegador

```
npm run banco && python3 -m http.server 8000 --directory www
```

Abra `http://localhost:8000`. Lembrete diário, compartilhar e salvar arquivo usam plugins do celular. No navegador o lembrete só é salvo e os arquivos são baixados.

## Testes da lógica

`npm test` (`node --test tests`).
