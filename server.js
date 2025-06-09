const express = require('express');
const multer = require('multer');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Configuração básica do multer para receber arquivos
const upload = multer({ storage: multer.memoryStorage() });

// CORS liberado para a câmera
app.use(cors());

// Middleware para log detalhado
app.use((req, res, next) => {
  console.log('\n' + '='.repeat(50));
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('🌐 IP:', req.ip || req.connection.remoteAddress);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Endpoint único para a câmera
app.post('/camera-webhook', upload.any(), (req, res) => {
  try {
    console.log('📸 DADOS RECEBIDOS DA CÂMERA:');
    
    // Log do corpo da requisição (exceto arquivos binários)
    console.log('📦 Corpo (JSON):', req.body.event_log || 'Campo event_log não encontrado');
    
    // Log dos arquivos recebidos
    if (req.files && req.files.length > 0) {
      console.log('📁 Arquivos:');
      req.files.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
      });
    } else {
      console.log('📁 Nenhum arquivo recebido');
    }

    // Responder à câmera com status 200
    res.status(200).json({ 
      success: true,
      message: 'Dados recebidos pelo servidor',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 ERRO:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Endpoint de saúde (para o Render)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor rodando em http://0.0.0.0:${port}`);
  console.log(`📍 Endpoint da câmera: POST /camera-webhook\n`);
});
