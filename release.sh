#!/usr/bin/env bash
# Gera o APK assinado e publica uma release no GitHub (o Obtainium do celular dela atualiza a partir daqui).
# Uso: ./release.sh "o que mudou"
set -euo pipefail
cd "$(dirname "$0")"
CFG=~/.config/simulado-enare
if [ ! -f "$CFG/keystore.properties" ]; then  # primeira vez: cria a chave de release fora do repo
  mkdir -p "$CFG" && chmod 700 "$CFG"
  SENHA=$(openssl rand -hex 24)
  keytool -genkeypair -keystore "$CFG/release.jks" -alias simulado -keyalg RSA -keysize 4096 -validity 36500 \
    -storepass "$SENHA" -keypass "$SENHA" -dname "CN=Simulado ENARE Psico" >/dev/null 2>&1
  printf 'storeFile=%s\nstorePassword=%s\nkeyAlias=simulado\nkeyPassword=%s\n' "$CFG/release.jks" "$SENHA" "$SENHA" > "$CFG/keystore.properties"
  chmod 600 "$CFG/keystore.properties" "$CFG/release.jks"
  echo "Chave de release criada em $CFG. Faça backup dela: sem ela, atualizações não instalam por cima."
fi
N=$(git rev-list --count HEAD)
BANCO=$(python3 -c "import json;print(json.load(open('banco/meta.json'))['versao_banco'])")
VER="1.$N"
(cd app && npm run -s banco && npx cap sync android >/dev/null)
(cd app/android && ./gradlew -q assembleRelease -PversionCode="$N" -PversionName="$VER")
APK=app/android/app/build/outputs/apk/release/app-release.apk
cp "$APK" "simulado-enare-psico-$VER.apk"
git push -q origin HEAD
gh release create "v$VER" "simulado-enare-psico-$VER.apk" --target "$(git rev-parse HEAD)" --title "v$VER (banco $BANCO)" --notes "${1:-Atualização}"
rm "simulado-enare-psico-$VER.apk"
echo "Release v$VER publicada."
