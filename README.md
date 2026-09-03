# OTA Firmware

Servidor web para distribuir firmwares por grupos de dispositivos, identificados por Family ID e placa. O MAC continua identificando cada unidade no acesso OTA.

## Fluxo

1. O device chama `GET /api/firmware/:board/manifest.json?familyId=<id>&mac=<mac>`.
2. O servidor cadastra ou atualiza o MAC com a Family ID e a placa anunciadas.
3. Pela dashboard, associe o device a um grupo e publique um `.bin` e uma versao para esse grupo.
4. Enquanto o device nao estiver em um grupo com firmware, o manifesto responde `404`.
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
GET /api/firmware/esp32-devkit/manifest.json?familyId=esp32-devkit-01&mac=AA:BB:CC:DD:EE:FF
GET /api/firmware/esp32-devkit/binary?mac=AA:BB:CC:DD:EE:FF
```

## Seguranca de login

Tres erros de login bloqueiam o IP por 6 horas.
