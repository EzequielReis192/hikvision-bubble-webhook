# Configuração da Câmera Hikvision DS-K1T342MFWX

## 📋 Configurações do HTTP Listening

Após fazer o deploy no Render, você receberá uma URL como:
`https://seu-app-name.onrender.com`

### Configurar na Câmera:

1. **Acesse a interface web da câmera**
2. **Vá para a aba "HTTP Listening"**
3. **Configure os campos:**

```
Event Alarm IP Address/Domain Name: https://seu-app-name.onrender.com
URL: /webhook
Port: 443
Protocol: HTTPS
```

**OU se preferir HTTP:**

```
Event Alarm IP Address/Domain Name: http://seu-app-name.onrender.com
URL: /webhook  
Port: 80
Protocol: HTTP
```

## 🔧 Explicação das Configurações:

- **Event Alarm IP Address/Domain Name**: Domínio do seu servidor no Render
- **URL**: Pode ser qualquer caminho (ex: `/webhook`, `/camera`, `/eventos`)
- **Port**: 443 para HTTPS ou 80 para HTTP
- **Protocol**: HTTPS (recomendado) ou HTTP

## 📊 Como Funciona:

1. **Câmera detecta evento** (reconhecimento facial, movimento, etc.)
2. **Faz POST** para: `https://seu-app-name.onrender.com/webhook`
3. **Servidor processa** os dados multipart/form-data
4. **Converte para JSON** e envia para o Bubble
5. **Responde à câmera** confirmando recebimento

## 🔍 Exemplo de Dados Enviados pela Câmera:

```
POST /webhook HTTP/1.1
Host: seu-app-name.onrender.com
Content-Type: multipart/form-data; boundary=MIME_boundary
Content-Length: 699

--MIME_boundary
Content-Disposition: form-data; name="event_log"

{
  "ipAddress": "192.168.1.100",
  "portNo": 80,
  "protocol": "HTTP",
  "macAddress": "e0:ba:ad:82:1a:a9",
  "channelID": 1,
  "dateTime": "2025-06-01T09:30:52-03:00",
  "activePostCount": 1,
  "eventType": "AccessControllerEvent",
  "eventState": "active",
  "eventDescription": "Access Controller Event",
  "AccessControllerEvent": {
    "deviceName": "subdoorOne",
    "majorEventType": 2,
    "subEventType": 1024,
    "verifyNo": 128,
    "serialNo": 52,
    "currentVerifyMode": "invalid",
    "frontSerialNo": 0,
    "attendanceStatus": "undefined",
    "label": "",
    "statusValue": 0,
    "mask": "unknown",
    "purePwdVerifyEnable": true
  }
}
--MIME_boundary--
```

## 🎯 Dados Processados e Enviados ao Bubble:

```json
{
  "timestamp": "2025-06-01T09:30:52-03:00",
  "ip_address": "192.168.1.100",
  "mac_address": "e0:ba:ad:82:1a:a9",
  "device_name": "subdoorOne",
  "event_type": "AccessControllerEvent",
  "event_state": "active",
  "event_description": "Access Controller Event",
  "major_event_type": 2,
  "sub_event_type": 1024,
  "verify_no": 128,
  "serial_no": 52,
  "verify_mode": "invalid",
  "attendance_status": "undefined",
  "mask_status": "unknown",
  "processed_at": "2025-06-08T15:30:00.000Z",
  "status": "pending_processing"
}
```

## ⚠️ Importante:

- **O servidor aceita qualquer URL** (usando `app.post('*', ...)`)
- **Logs detalhados** para debug
- **Resposta sempre 200** para a câmera (evita reenvios)
- **Timeout de 10s** para requisições ao Bubble

## 🧪 Teste da Configuração:

1. **Health Check**: `https://seu-app-name.onrender.com/health`
2. **Teste Bubble**: `https://seu-app-name.onrender.com/test-bubble`
3. **Logs**: Disponíveis no painel do Render

## 🔧 Troubleshooting:

- **Câmera não envia dados**: Verifique IP/URL
- **Servidor não responde**: Verifique logs no Render
- **Bubble não recebe**: Verifique BUBBLE_WEBHOOK_URL
- **Timeout**: Servidor Render pode estar "dormindo" (Free tier)

## 📝 Exemplo Prático:

Se sua URL do Render for: `https://meu-webhook-escola.onrender.com`

Configuração na câmera:
```
Event Alarm IP Address/Domain Name: https://meu-webhook-escola.onrender.com
URL: /reconhecimento
Port: 443
Protocol: HTTPS
```

A câmera enviará dados para:
`https://meu-webhook-escola.onrender.com/reconhecimento`