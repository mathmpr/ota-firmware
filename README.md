# OTA Firmware

Servidor web para distribuir firmwares por dispositivo usando MAC address.

## Fluxo

1. O device chama `GET /api/firmware/:board/manifest.json?deviceId=<id>&mac=<mac>`.
2. Se o MAC nunca foi visto, o servidor cadastra o device e salva apenas o primeiro request bruto.
3. Enquanto nao houver firmware para esse MAC, o manifesto responde `404`.
4. Pela dashboard, publique um `.bin` e uma versao para o device.
5. No proximo request, o device recebe `version` e `binaryUrl`.
6. O MiniCore compara com a versao local e baixa o binario se a versao for diferente.

## Setup local

```bash
cp .env-example .env
make install
make init-db
make start
```

Usuario padrao definido no seed:

```text
admin@ota.local
admin123456
```

Altere `DEFAULT_ADMIN_EMAIL` e `DEFAULT_ADMIN_PASSWORD` no `.env` antes de rodar `make init-db` se quiser outro login.

## Endpoints MiniCore

```text
GET /api/firmware/esp32-devkit/manifest.json?deviceId=esp32-devkit-01&mac=AA:BB:CC:DD:EE:FF
GET /api/firmware/esp32-devkit/binary?deviceId=esp32-devkit-01&mac=AA:BB:CC:DD:EE:FF
```

## Seguranca de login

Tres erros de login bloqueiam o IP por 6 horas.
