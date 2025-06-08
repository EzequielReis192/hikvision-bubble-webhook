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

// Endpoint para receber dados da câmera Hikvision
// A câmera enviará para este endpoint exatamente como configurado no HTTP Listening
app.post('*', upload.none(), async (req, res) => {
    try {
        console.log('=== DADOS RECEBIDOS DA CÂMERA HIKVISION ===');
        console.log('URL acessada:', req.path);
        console.log('Headers:', req.headers);
        console.log('Body (form data):', req.body);
        console.log('============================================');
        
        // Extrair o event_log que contém os dados JSON da câmera
        const eventLogString = req.body.event_log;
        
        if (!eventLogString) {
            console.log('❌ event_log não encontrado no body:', req.body);
            return res.status(400).json({ error: 'event_log não encontrado' });
        }

        console.log('📝 Event log string:', eventLogString);

        // Parse do JSON
        const eventData = JSON.parse(eventLogString);
        
        // Processar e estruturar dados para o Bubble
        const processedData = {
            // Informações básicas do evento
            timestamp: eventData.dateTime,
            ip_address: eventData.ipAddress,
            mac_address: eventData.macAddress,
            device_name: eventData.AccessControllerEvent?.deviceName || 'unknown',
            
            // Informações do evento de acesso
            event_type: eventData.eventType,
            event_state: eventData.eventState,
            event_description: eventData.eventDescription,
            
            // Dados específicos do controle de acesso
            major_event_type: eventData.AccessControllerEvent?.majorEventType,
            sub_event_type: eventData.AccessControllerEvent?.subEventType,
            verify_no: eventData.AccessControllerEvent?.verifyNo,
            serial_no: eventData.AccessControllerEvent?.serialNo,
            verify_mode: eventData.AccessControllerEvent?.currentVerifyMode,
            attendance_status: eventData.AccessControllerEvent?.attendanceStatus,
            mask_status: eventData.AccessControllerEvent?.mask,
            
            // Timestamp de processamento
            processed_at: new Date().toISOString(),
            
            // Status para controle no Bubble
            status: 'pending_processing'
        };

        console.log('✅ Dados processados para Bubble:', JSON.stringify(processedData, null, 2));

        console.log('🚀 Enviando para Bubble:', BUBBLE_WEBHOOK_URL);

        // Enviar para Bubble
        const bubbleResponse = await axios.post(BUBBLE_WEBHOOK_URL, processedData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 segundos de timeout
        });

        console.log('✅ Sucesso no Bubble - Status:', bubbleResponse.status);

        // Responder à câmera Hikvision (formato que ela espera)
        res.status(200).json({ 
            success: true, 
            message: 'Event processed successfully',
            processed_at: new Date().toISOString(),
            event_id: eventData.AccessControllerEvent?.serialNo || 'unknown'
        });

    } catch (error) {
        console.error('❌ ERRO ao processar webhook da Hikvision:', error.message);
        
        // Log detalhado do erro
        if (error.response) {
            console.error('❌ Erro na resposta do Bubble:', {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            });
        }
        
        // Responder à câmera mesmo com erro (para ela não ficar reenviando)
        res.status(200).json({ 
            success: false,
            error: 'Internal processing error',
            message: 'Event received but processing failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint de health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'Hikvision-Bubble Webhook Processor'
    });
});

// Endpoint para testar a conexão com Bubble
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

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});