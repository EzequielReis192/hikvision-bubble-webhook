# Hikvision Bubble Webhook Processor

Servidor intermediário para processar webhooks da câmera Hikvision DS-K1T342MFWX e enviar dados estruturados para Bubble.io.

## 🎯 Objetivo

Resolver o problema de integração entre câmeras Hikvision (que enviam dados em `multipart/form-data`) e Bubble.io (que funciona melhor com JSON).

## 🚀 Deploy no Render

Este projeto está configurado para deploy automático no Render.com.

### Variáveis de Ambiente Necessárias:

- `BUBBLE_WEBHOOK_URL`: URL do webhook do seu app Bubble
- `PORT`: Porta do servidor (configurada automaticamente pelo Render)

## 📦 Estrutura do Projeto

```
├── server.js          # Servidor principal
├── package.json       # Dependências do Node.js
├── README.md          # Esta documentação
├── render.yaml        # Configuração do Render
├── .gitignore         # Arquivos a ignorar
└── CAMERA_CONFIG.md   # Guia de configuração da câmera
```

## 🔧 Configuração Local (Desenvolvimento)

1. Clone o repositório
2. Instale dependências: `npm install`
3. Configure variável de ambiente: `export BUBBLE_WEBHOOK_URL="sua_url_bubble"`
4. Execute: `npm start`

## 📊 Endpoints Disponíveis

- `POST /*` - Recebe dados da câmera (aceita qualquer URL)
- `GET /health` - Health check
- `POST /test-bubble` - Testa conexão com Bubble

## 🔧 Configuração da Câmera Hikvision

### HTTP Listening Settings:
```
Event Alarm IP Address/Domain Name: https://seu-app.onrender.com
URL: /webhook
Port: 443
Protocol: HTTPS
```

## 🏗️ Estrutura de Dados Enviados ao Bubble

```json
{
  "timestamp": "2025-06-01T09:30:52-03:00",
  "device_name": "subdoorOne",
  "verify_no": 128,
  "serial_no": 52,
  "event_type": "AccessControllerEvent",
  "status": "pending_processing"
}
```

## 📝 Logs

O servidor registra todos os eventos para facilitar o debug e monitoramento.

## 🔒 Segurança

- Validação de dados recebidos
- Tratamento de erros robusto
- Timeouts configurados para requisições externas
- Sempre responde 200 à câmera (evita reenvios)

## 🧪 Teste

- Health check: `https://seu-app.onrender.com/health`
- Teste Bubble: `https://seu-app.onrender.com/test-bubble`