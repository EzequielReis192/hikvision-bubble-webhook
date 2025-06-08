# Integração Câmera Hikvision + Bubble

Este servidor Node.js serve como intermediário entre a câmera Hikvision DS-K1T342MFWX e o Bubble, convertendo dados de `multipart/form-data` para JSON.

## 🚀 Deploy no Render

### 1. Preparação
1. Crie uma conta no [Render.com](https://render.com)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente

### 2. Configuração das Variáveis de Ambiente
No Render, configure:
- `BUBBLE_WEBHOOK_URL`: URL do webhook do seu app Bubble
- `NODE_ENV`: production
- `PORT`: 3000 (automático no Render)

### 3. URL do Servidor
Após o deploy, você receberá uma URL como:
`https://seu-app.onrender.com`

## 📷 Configuração da Câmera Hikvision

Configure na câmera:
- **Event Alarm IP Address/Domain Name**: `https://seu-app.onrender.com`
- **URL**: `/camera-webhook`
- **Port**: `443` (para HTTPS)
- **Protocol**: `HTTPS`

## 🔗 Configuração no Bubble

### 1. Criar Workflow de API
1. Vá em Settings > API
2. Crie um novo endpoint: `webhook-camera`
3. Configure como POST
4. Defina os parâmetros que deseja receber

### 2. Estrutura dos Dados Recebidos
O servidor enviará os dados neste formato:
```json
{
  "timestamp": "2025-01-01T12:00:00.000Z",
  "ipAddress": "",
  "macAddress": "e0:ba:ad:82:1a:a9",
  "channelID": 1,
  "dateTime": "2025-06-01T09:30:52-03:00",
  "eventType": "AccessControllerEvent",
  "eventState": "active",
  "eventDescription": "Access Controller Event",
  "accessController": {
    "deviceName": "subdoorOne",
    "majorEventType": 2,
    "subEventType": 1024,
    "verifyNo": 128,
    "serialNo": 52,
    "currentVerifyMode": "invalid",
    "attendanceStatus": "undefined",
    "label": "",
    "statusValue": 0,
    "mask": "unknown",
    "purePwdVerifyEnable": true
  }
}
```

### 3. No Bubble Workflow
Configure as ações desejadas, como:
- Salvar dados no banco
- Enviar notificações
- Atualizar status de presença

## 🧪 Testes

### Endpoints Disponíveis
- `GET /test` - Teste básico do servidor
- `GET /health` - Status de saúde
- `POST /camera-webhook` - Endpoint principal da câmera
- `POST /test-bubble` - Teste de integração com Bubble

### Testando Localmente
```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Rodar em produção
npm start
```

### Teste da Integração
1. Use Postman ou curl para testar:
```bash
curl -X POST https://seu-app.onrender.com/test-bubble \
  -H "Content-Type: application/json" \
  -d '{"teste": "dados de teste"}'
```

## 📊 Monitoramento

### Logs no Render
- Acesse o dashboard do Render
- Vá na aba "Logs" do seu serviço
- Monitore os logs em tempo real

### Logs Importantes
- `📸 Dados recebidos da câmera` - Dados da câmera
- `🔄 Dados processados` - Dados convertidos
- `✅ Dados enviados ao Bubble` - Envio bem-sucedido
- `❌ Erro ao enviar dados ao Bubble` - Erro no envio

## 🔧 Solução de Problemas

### Câmera não envia dados
1. Verifique a configuração de rede da câmera
2. Teste a conectividade: `ping sua-app.onrender.com`
3. Verifique se a URL está correta

### Bubble não recebe dados
1. Verifique a URL do webhook no Bubble
2. Confirme que o endpoint está ativo
3. Verifique os logs do servidor

### Servidor offline
1. Verifique os logs no Render
2. Render free tier hiberna após inatividade
3. Configure um health check ou upgrade para plan pago

## 📋 Próximos Passos

1. **Deploy inicial**: Faça o deploy e teste básico
2. **Configurar câmera**: Configure com a URL do servidor
3. **Configurar Bubble**: Crie o workflow de API
4. **Testar integração**: Verifique se os dados chegam
5. **Implementar lógica**: Adicione regras de negócio no Bubble
6. **Monitorar**: Acompanhe logs e funcionamento

## 💡 Dicas

- Use o plano pago do Render para produção (evita hibernação)
- Configure alertas para monitorar o sistema
- Mantenha backups das configurações
- Teste regularmente a integração
