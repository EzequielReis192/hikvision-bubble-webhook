const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do multer para processar multipart/form-data (igual câmera Hikvision)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB para as fotos
    fieldSize: 2 * 1024 * 1024,  // 2MB para o event_log JSON
    files: 10 // Máximo 10 arquivos
  }
});

// CORS configurado para aceitar requisições da câmera
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));

// Middleware para logging detalhado
app.use((req, res, next) => {
  console.log('\n' + '='.repeat(60));
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('🌐 IP:', req.ip || req.connection.remoteAddress);
  console.log('📋 Headers importantes:');
  console.log('   Content-Type:', req.get('Content-Type'));
  console.log('   Content-Length:', req.get('Content-Length'));
  console.log('   User-Agent:', req.get('User-Agent'));
  console.log('   Host:', req.get('Host'));
  next();
});

// Middleware padrão do express (depois do logging)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// URL do webhook do Bubble
const BUBBLE_WEBHOOK_URL = process.env.BUBBLE_WEBHOOK_URL || 'https://sua-app.bubbleapps.io/api/1.1/wf/webhook-camera';

// Função para processar dados da câmera Hikvision
function processarDadosHikvision(eventLogString, arquivos = []) {
  try {
    console.log('🔄 Processando dados da câmera Hikvision...');
    
    // Parse do JSON do event_log
    const eventData = JSON.parse(eventLogString);
    console.log('✅ JSON do event_log parseado com sucesso');
    
    // Processar arquivos de imagem
    const imagens = [];
    if (arquivos && arquivos.length > 0) {
      console.log(`📸 Processando ${arquivos.length} arquivo(s):`);
      
      arquivos.forEach((arquivo, index) => {
        console.log(`   ${index + 1}. ${arquivo.originalname} (${arquivo.mimetype}, ${arquivo.size} bytes)`);
        
        // Converter imagem para base64 para enviar ao Bubble
        const imagemBase64 = arquivo.buffer.toString('base64');
        imagens.push({
          nome: arquivo.originalname || `imagem_${index + 1}.jpg`,
          tipo: arquivo.mimetype || 'image/jpeg',
          tamanho: arquivo.size,
          dados: imagemBase64,
          dataUrl: `data:${arquivo.mimetype || 'image/jpeg'};base64,${imagemBase64}`
        });
      });
    }
    
    // Estruturar dados para o Bubble (baseado no formato real da câmera)
    const dadosProcessados = {
      // Timestamp do processamento
      processedAt: new Date().toISOString(),
      
      // Dados básicos da câmera
      dispositivo: {
        ipAddress: eventData.ipAddress,
        macAddress: eventData.macAddress,
        portNo: eventData.portNo,
        protocol: eventData.protocol,
        channelID: eventData.channelID
      },
      
      // Informações do evento
      evento: {
        dateTime: eventData.dateTime,
        eventType: eventData.eventType,
        eventState: eventData.eventState,
        eventDescription: eventData.eventDescription,
        activePostCount: eventData.activePostCount
      },
      
      // Dados específicos do controle de acesso
      controleAcesso: eventData.AccessControllerEvent ? {
        deviceName: eventData.AccessControllerEvent.deviceName,
        name: eventData.AccessControllerEvent.name || '',
        employeeNoString: eventData.AccessControllerEvent.employeeNoString || '',
        verifyNo: eventData.AccessControllerEvent.verifyNo,
        serialNo: eventData.AccessControllerEvent.serialNo,
        userType: eventData.AccessControllerEvent.userType || '',
        currentVerifyMode: eventData.AccessControllerEvent.currentVerifyMode || '',
        attendanceStatus: eventData.AccessControllerEvent.attendanceStatus || '',
        mask: eventData.AccessControllerEvent.mask || '',
        majorEventType: eventData.AccessControllerEvent.majorEventType,
        subEventType: eventData.AccessControllerEvent.subEventType,
        cardReaderKind: eventData.AccessControllerEvent.cardReaderKind || 0,
        cardReaderNo: eventData.AccessControllerEvent.cardReaderNo || 0,
        picturesNumber: eventData.AccessControllerEvent.picturesNumber || 0,
        purePwdVerifyEnable: eventData.AccessControllerEvent.purePwdVerifyEnable || false
      } : null,
      
      // Imagens capturadas
      imagens: imagens,
      totalImagens: imagens.length,
      
      // Dados brutos para referência (sem as imagens para não ficar muito grande)
      dadosBrutos: eventData
    };
    
    console.log('✅ Dados processados com sucesso!');
    console.log(`👤 Usuário: ${eventData.AccessControllerEvent?.name || 'N/A'}`);
    console.log(`🏢 Dispositivo: ${eventData.AccessControllerEvent?.deviceName || 'N/A'}`);
    console.log(`📸 Imagens: ${imagens.length}`);
    
    return dadosProcessados;
    
  } catch (error) {
    console.error('❌ Erro ao processar dados da câmera:', error.message);
    return null;
  }
}

// Função para enviar dados ao Bubble
async function enviarParaBubble(dados) {
  try {
    console.log('📤 Enviando dados ao Bubble...');
    console.log('🔗 URL:', BUBBLE_WEBHOOK_URL);
    
    const response = await axios.post(BUBBLE_WEBHOOK_URL, dados, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Hikvision-Camera-Webhook/1.0'
      },
      timeout: 30000, // 30 segundos para dar tempo das imagens
      maxContentLength: 50 * 1024 * 1024, // 50MB
      maxBodyLength: 50 * 1024 * 1024
    });
    
    console.log('✅ Enviado ao Bubble com sucesso!');
    console.log('📊 Status:', response.status);
    console.log('📝 Response:', JSON.stringify(response.data).substring(0, 200) + '...');
    
    return { 
      success: true, 
      status: response.status, 
      data: response.data 
    };
    
  } catch (error) {
    console.error('❌ Erro ao enviar ao Bubble:', error.message);
    
    if (error.response) {
      console.error('📊 Status da resposta:', error.response.status);
      console.error('📝 Dados da resposta:', JSON.stringify(error.response.data).substring(0, 500));
    }
    
    return { 
      success: false, 
      error: error.message,
      status: error.response?.status,
      responseData: error.response?.data
    };
  }
}

// ENDPOINT PRINCIPAL - Exatamente como a câmera Hikvision envia
app.post('/camera-webhook', upload.any(), async (req, res) => {
  try {
    console.log('📸 DADOS DA CÂMERA HIKVISION RECEBIDOS!');
    console.log('🔍 Analisando requisição...');
    
    // Verificar se tem o campo event_log (obrigatório)
    if (!req.body.event_log) {
      console.log('❌ Campo event_log não encontrado!');
      console.log('📋 Campos recebidos:', Object.keys(req.body));
      console.log('📁 Arquivos recebidos:', req.files?.length || 0);
      
      return res.status(400).json({
        error: 'Campo event_log obrigatório não encontrado',
        receivedFields: Object.keys(req.body),
        receivedFiles: req.files?.length || 0
      });
    }
    
    console.log('✅ Campo event_log encontrado!');
    console.log('📁 Arquivos recebidos:', req.files?.length || 0);
    
    // Mostrar informações dos arquivos
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        console.log(`   📷 Arquivo ${index + 1}: ${file.originalname} (${file.size} bytes)`);
      });
    }
    
    // Processar dados
    const dadosProcessados = processarDadosHikvision(req.body.event_log, req.files);
    
    if (!dadosProcessados) {
      console.log('❌ Falha ao processar dados da câmera');
      return res.status(400).json({
        error: 'Erro ao processar dados da câmera',
        eventLog: req.body.event_log.substring(0, 200) + '...'
      });
    }
    
    // Salvar cópia local para debug (opcional)
    if (process.env.SAVE_DEBUG_DATA === 'true') {
      const debugFile = `debug_${Date.now()}.json`;
      fs.writeFileSync(debugFile, JSON.stringify(dadosProcessados, null, 2));
      console.log(`💾 Dados salvos em: ${debugFile}`);
    }
    
    // Enviar para o Bubble
    console.log('📤 Enviando para o Bubble...');
    const resultadoBubble = await enviarParaBubble(dadosProcessados);
    
    // Responder para a câmera
    if (resultadoBubble.success) {
      console.log('🎉 SUCESSO TOTAL! Dados processados e enviados ao Bubble');
      res.status(200).json({
        message: 'Dados da câmera processados e enviados com sucesso',
        timestamp: new Date().toISOString(),
        usuario: dadosProcessados.controleAcesso?.name,
        dispositivo: dadosProcessados.controleAcesso?.deviceName,
        imagens: dadosProcessados.totalImagens,
        bubbleStatus: resultadoBubble.status
      });
    } else {
      console.log('⚠️ Dados processados mas erro ao enviar ao Bubble');
      res.status(207).json({ // 207 Multi-Status
        message: 'Dados da câmera processados mas erro ao enviar ao Bubble',
        timestamp: new Date().toISOString(),
        bubbleError: resultadoBubble.error,
        dadosProcessados: dadosProcessados
      });
    }
    
  } catch (error) {
    console.error('💥 ERRO CRÍTICO no endpoint da câmera:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar com dados similares à câmera
app.post('/test-camera', upload.any(), async (req, res) => {
  console.log('🧪 TESTE SIMULANDO CÂMERA HIKVISION');
  
  // Simular dados da câmera se não foram fornecidos
  const eventLogTeste = req.body.event_log || JSON.stringify({
    "ipAddress": "192.168.1.100",
    "portNo": 443,
    "protocol": "HTTPS",
    "macAddress": "e0:ba:ad:82:1a:a9",
    "channelID": 1,
    "dateTime": new Date().toISOString(),
    "activePostCount": 1,
    "eventType": "AccessControllerEvent",
    "eventState": "active",
    "eventDescription": "Access Controller Event",
    "AccessControllerEvent": {
      "deviceName": "subdoorOne",
      "majorEventType": 5,
      "subEventType": 75,
      "name": "TESTE_USUARIO",
      "verifyNo": 999,
      "employeeNoString": "TEST001",
      "serialNo": 1,
      "userType": "normal",
      "currentVerifyMode": "cardOrFaceOrFp",
      "mask": "no",
      "picturesNumber": req.files?.length || 0,
      "purePwdVerifyEnable": true
    }
  });
  
  const dadosProcessados = processarDadosHikvision(eventLogTeste, req.files);
  
  if (dadosProcessados) {
    const resultadoBubble = await enviarParaBubble(dadosProcessados);
    res.json({
      message: 'Teste processado com sucesso',
      dados: dadosProcessados,
      bubbleResult: resultadoBubble
    });
  } else {
    res.status(400).json({
      error: 'Erro ao processar dados de teste',
      eventLog: eventLogTeste
    });
  }
});

// Endpoints utilitários
app.get('/test', (req, res) => {
  res.json({
    message: '🚀 Servidor Hikvision-Bubble funcionando!',
    timestamp: new Date().toISOString(),
    endpoints: {
      main: 'POST /camera-webhook - Recebe dados da câmera',
      test: 'POST /test-camera - Teste com dados simulados',
      health: 'GET /health - Status do servidor',
      bubble: 'POST /test-bubble - Teste conexão Bubble'
    },
    config: {
      port: port,
      bubbleUrl: BUBBLE_WEBHOOK_URL,
      nodeVersion: process.version
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage()
  });
});

// Teste específico para o Bubble
app.post('/test-bubble', async (req, res) => {
  const dadosTeste = {
    timestamp: new Date().toISOString(),
    test: true,
    message: 'Teste de conexão com Bubble',
    serverInfo: {
      port: port,
      uptime: process.uptime()
    }
  };
  
  const resultado = await enviarParaBubble(dadosTeste);
  res.json({
    message: 'Teste Bubble executado',
    resultado: resultado
  });
});

// Middleware de erro
app.use((error, req, res, next) => {
  console.error('💥 ERRO NÃO TRATADO:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: error.message
  });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log('\n' + '🎯'.repeat(30));
  console.log('🚀 SERVIDOR HIKVISION-BUBBLE INICIADO!');
  console.log('');
  console.log(`📡 Porta: ${port}`);
  console.log(`🌐 Host: 0.0.0.0 (aceita conexões externas)`);
  console.log(`🔗 Bubble URL: ${BUBBLE_WEBHOOK_URL}`);
  console.log('');
  console.log('📍 URL para configurar na câmera:');
  console.log(`   https://hikvision-bubble-webhook.onrender.com/camera-webhook`);
  console.log('');
  console.log('🧪 Endpoints de teste:');
  console.log(`   GET  /test - Status do servidor`);
  console.log(`   POST /test-camera - Simular dados da câmera`);
  console.log(`   POST /test-bubble - Testar conexão Bubble`);
  console.log('');
  console.log('🎯'.repeat(30) + '\n');
});
