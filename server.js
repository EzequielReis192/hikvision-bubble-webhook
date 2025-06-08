const express = require('express');
const multer = require('multer');
const axios = require('axios');
const app = express();

// Configuração do multer para processar multipart/form-data
const upload = multer();

// URL do seu webhook no Bubble
const BUBBLE_WEBHOOK_URL = process.env.BUBBLE_WEBHOOK_URL || 'https://SEU_APP.bubbleapps.io/api/1.1/wf/webhook_reconhecimento_facial';

// Middleware para logs
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Endpoint para receber dados da câmera Hikvision (VERSÃO ATUALIZADA)
app.post('*', upload.none(), async (req, res) => {
    try {
        console.log('=== DADOS RECEBIDOS (RAW) ===');
        console.log('Headers:', req.headers);
        console.log('Body completo (raw):', req.body); // Log detalhado do body bruto

        // Extrair e validar o event_log
        const eventLogString = req.body.event_log;
        if (!eventLogString) {
            console.error('❌ Campo "event_log" não encontrado no body:', req.body);
            return res.status(400).json({ error: 'Campo "event_log" ausente' });
        }

        console.log('📝 Conteúdo de event_log:', eventLogString);
        
        // Parse do JSON
        const eventData = JSON.parse(eventLogString);
        console.log('✅ JSON parseado:', eventData);

        // Processar dados para o Bubble (mantive sua lógica original)
        const processedData = {
            timestamp: eventData.dateTime,
            ip_address: eventData.ipAddress,
            mac_address: eventData.macAddress,
            device_name: eventData.AccessControllerEvent?.deviceName || 'unknown',
            event_type: eventData.eventType,
            event_state: eventData.eventState,
            event_description: eventData.eventDescription,
            major_event_type: eventData.AccessControllerEvent?.majorEventType,
            sub_event_type: eventData.AccessControllerEvent?.subEventType,
            verify_no: eventData.AccessControllerEvent?.verifyNo,
            serial_no: eventData.AccessControllerEvent?.serialNo,
            verify_mode: eventData.AccessControllerEvent?.currentVerifyMode,
            attendance_status: eventData.AccessControllerEvent?.attendanceStatus,
            mask_status: eventData.AccessControllerEvent?.mask,
            processed_at: new Date().toISOString(),
            status: 'pending_processing'
        };

        console.log('✅ Dados processados para Bubble:', JSON.stringify(processedData, null, 2));

        // Responder à câmera PRIMEIRO (evita timeout)
        res.status(200).json({ 
            success: true, 
            message: 'Dados recebidos com sucesso',
            received_at: new Date().toISOString() 
        });

        // Enviar para Bubble (AGORA ASSÍNCRONO, após responder à câmera)
        console.log('🚀 Enviando para Bubble:', BUBBLE_WEBHOOK_URL);
        const bubbleResponse = await axios.post(BUBBLE_WEBHOOK_URL, processedData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        console.log('✅ Sucesso no Bubble - Status:', bubbleResponse.status);

    } catch (error) {
        console.error('❌ ERRO GRAVE:', error.message);
        if (error.response) {
            console.error('❌ Erro no Bubble:', {
                status: error.response.status,
                data: error.response.data
            });
        }
        
        // Sempre responda à câmera (evita reenvios)
        res.status(200).json({ 
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint de health check (mantido original)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'Hikvision-Bubble Webhook Processor'
    });
});

// Endpoint para testar a conexão com Bubble (mantido original)
app.post('/test-bubble', async (req, res) => {
    try {
        const testData = {
            test: true,
            timestamp: new Date().toISOString(),
            message: 'Teste de conexão'
        };
        const response = await axios.post(BUBBLE_WEBHOOK_URL, testData);
        res.json({ success: true, bubble_response: response.status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Webhook endpoint: Aceita qualquer URL POST`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

// Tratamento de erros não capturados (mantido original)
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
