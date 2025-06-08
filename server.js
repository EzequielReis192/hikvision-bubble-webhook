const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do multer para processar multipart/form-data
const upload = multer();

// Middleware
app.use(cors({
  origin: '*', // Permite todas as origens para teste
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// URL do webhook do Bubble - SUBSTITUA PELA SUA URL
const BUBBLE_WEBHOOK_URL = process.env.BUBBLE_WEBHOOK_URL || 'https://sua-app.bubbleapps.io/api/1.1/wf/webhook-camera';

// Função para processar dados da câmera
function processarDadosCamera(eventLog) {
  try {
    // Parse do JSON se vier como string
    const dados = typeof eventLog === 'string' ? JSON.parse(eventLog) : eventLog;
    
    // Estrutura dos dados processados para enviar ao Bubble
    const dadosProcessados = {
      // Informações básicas do evento
      timestamp: new Date().toISOString(),
      ipAddress: dados.ipAddress || '',
      macAddress: dados.macAddress || '',
      channelID: dados.channelID || 1,
      dateTime: dados.dateTime || new Date().toISOString(),
      
      // Informações do evento
      eventType: dados.eventType || '',
      eventState: dados.eventState || '',
      eventDescription: dados.eventDescription || '',
      
      // Informações específicas do controle de acesso
      accessController: {
        deviceName: dados.AccessControllerEvent?.deviceName || '',
        majorEventType: dados.AccessControllerEvent?.majorEventType || 0,
        subEventType: dados.AccessControllerEvent?.subEventType || 0,
        verifyNo: dados.AccessControllerEvent?.verifyNo || 0,
        serialNo: dados.AccessControllerEvent?.serialNo || 0,
        currentVerifyMode: dados.AccessControllerEvent?.currentVerifyMode || '',
        attendanceStatus: dados.AccessControllerEvent?.attendanceStatus || '',
        label: dados.AccessControllerEvent?.label || '',
        statusValue: dados.AccessControllerEvent?.statusValue || 0,
        mask: dados.AccessControllerEvent?.mask || '',
        purePwdVerifyEnable: dados.AccessControllerEvent?.purePwdVerifyEnable || false
      },
      
      // Dados brutos para referência
      rawData: dados
    };
    
    return dadosProcessados;
  } catch (error) {
    console.error('Erro ao processar dados da câmera:', error);
    return null;
  }
}

// Função para enviar dados ao Bubble
async function enviarParaBubble(dados) {
  try {
    const response = await axios.post(BUBBLE_WEBHOOK_URL, dados, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000 // 10 segundos timeout
    });
    
    console.log('✅ Dados enviados ao Bubble com sucesso:', response.status);
    return { success: true, status: response.status };
  } catch (error) {
    console.error('❌ Erro ao enviar dados ao Bubble:', error.message);
    return { success: false, error: error.message };
  }
}

// Endpoint principal para receber dados da câmera
app.post('/camera-webhook', upload.any(), async (req, res) => {
  try {
    console.log('📸 Dados recebidos da câmera:');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    
    // Extrair event_log do body
    const eventLog = req.body.event_log;
    
    if (!eventLog) {
      console.log('❌ event_log não encontrado no request');
      return res.status(400).json({ 
        error: 'event_log não encontrado',
        receivedBody: req.body 
      });
    }
    
    // Processar dados
    const dadosProcessados = processarDadosCamera(eventLog);
    
    if (!dadosProcessados) {
      console.log('❌ Erro ao processar dados da câmera');
      return res.status(400).json({ error: 'Erro ao processar dados da câmera' });
    }
    
    console.log('🔄 Dados processados:', JSON.stringify(dadosProcessados, null, 2));
    
    // Enviar para o Bubble
    const resultadoBubble = await enviarParaBubble(dadosProcessados);
    
    if (resultadoBubble.success) {
      res.status(200).json({ 
        message: 'Dados recebidos e enviados ao Bubble com sucesso',
        processedData: dadosProcessados
      });
    } else {
      res.status(500).json({ 
        message: 'Dados recebidos mas erro ao enviar ao Bubble',
        error: resultadoBubble.error,
        processedData: dadosProcessados
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral no endpoint:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Endpoint de teste
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString(),
    endpoints: {
      camera: '/camera-webhook (POST)',
      test: '/test (GET)',
      health: '/health (GET)'
    }
  });
});

// Endpoint de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Endpoint para testar integração com Bubble
app.post('/test-bubble', async (req, res) => {
  const dadosTeste = {
    timestamp: new Date().toISOString(),
    test: true,
    message: 'Teste de integração com Bubble',
    data: req.body
  };
  
  const resultado = await enviarParaBubble(dadosTeste);
  
  res.json({
    message: 'Teste de integração',
    resultado: resultado,
    dadosEnviados: dadosTeste
  });
});

// Middleware de erro
app.use((error, req, res, next) => {
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: error.message
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📡 Endpoint da câmera: http://localhost:${port}/camera-webhook`);
  console.log(`🔗 URL do Bubble configurada: ${BUBBLE_WEBHOOK_URL}`);
  console.log(`🧪 Teste: http://localhost:${port}/test`);
});
