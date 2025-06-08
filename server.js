const express = require('express');
const multer = require('multer');
const axios = require('axios');
const app = express();

// Configuração do multer para processar multipart/form-data
const upload = multer();

// Middlewares ESSENCIAIS para parsear diferentes tipos de conteúdo
app.use(express.json()); // Para application/json
app.use(express.urlencoded({ extended: true })); // Para application/x-www-form-urlencoded

// URL do seu webhook no Bubble
const BUBBLE_WEBHOOK_URL = process.env.BUBBLE_WEBHOOK_URL || 'https://SEU_APP.bubbleapps.io/api/1.1/wf/webhook_reconhecimento_facial';

// Middleware para logs aprimorado
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Content-Type:', req.headers['content-type']);
    next();
});

// Endpoint para receber dados da câmera Hikvision (VERSÃO CONSOLIDADA)
app.post('*', upload.none(), async (req, res) => {
    try {
        console.log('=== DADOS RECEBIDOS ===');
        console.log('Headers:', req.headers);
        console.log('Body:', req.body); // Agora deve mostrar os dados corretamente

        // Verificação robusta do body
        if (!req.body) {
            console.error('❌ Body vazio ou não parseado');
            return res.status(400).json({ error: 'Body inválido' });
        }

        // Extração segura do event_log
        const eventLogString = req.body.event_log;
        if (!eventLogString) {
            console.error('❌ Campo "event_log" ausente. Body completo:', req.body);
            return res.status(400).json({ error: 'Campo "event_log" é obrigatório' });
        }

        // Parse seguro do JSON
        let eventData;
        try {
            eventData = JSON.parse(eventLogString);
            console.log('✅ JSON parseado:', eventData);
        } catch (parseError) {
            console.error('❌ Erro ao parsear JSON:', parseError.message);
            return res.status(400).json({ error: 'Formato JSON inválido em event_log' });
        }

        // Processamento dos dados (mantendo sua lógica)
        const processedData = {
            timestamp: eventData.dateTime || new Date().toISOString(),
            ip_address: eventData.ipAddress || 'Não informado',
            device_name: eventData.AccessControllerEvent?.deviceName || 'unknown',
            event_type: eventData.eventType || 'unknown',
            // ... (demais campos conforme seu original)
        };

        // Resposta IMEDIATA para a câmera
        res.status(200).json({ 
            success: true,
            message: 'Evento recebido',
            received_at: new Date().toISOString()
        });

        // Envio para Bubble (ASSÍNCRONO)
        if (BUBBLE_WEBHOOK_URL.includes('bubbleapps.io')) { // Só envia se a URL estiver configurada
            axios.post(BUBBLE_WEBHOOK_URL, processedData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            })
            .then(response => {
                console.log('✅ Dados enviados para Bubble. Status:', response.status);
            })
            .catch(error => {
                console.error('❌ Falha no envio para Bubble:', error.message);
            });
        }

    } catch (error) {
        console.error('❌ ERRO NO PROCESSAMENTO:', error.message);
        res.status(200).json({ // Sempre responde à câmera
            success: false,
            error: 'Erro interno (consulte os logs)',
            timestamp: new Date().toISOString()
        });
    }
});

// ... (mantenha os endpoints /health e /test-bubble originais)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log('Endpoints:');
    console.log(`- POST /webhook (ou qualquer rota)`);
    console.log(`- GET /health`);
});

// ... (mantenha os handlers de erro originais)
