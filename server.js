import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';
import { config as dotenvConfig } from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { pool } from './src/utils/index.js';

dotenvConfig();

const app = express();

// IMPORTANTE: Se estiver atrás de um proxy (Nginx, Apache, Heroku, etc.), 
// configure o número correto de hops. Se for local puro, 'loopback' ou true costuma funcionar melhor.
app.set('trust proxy', 1);
// ==========================================
// CONFIGURAÇÕES DE RATE LIMITING (PROTEÇÃO)
// ==========================================

// Configuração Global (aplica em rotas gerais)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 500,               // 500 requisições por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: 'Muitas requisições vindas deste IP. Tente novamente em 15 minutos.'
    }
});

// ==========================================
// MIDDLEWARES DA APLICAÇÃO
// ==========================================

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(cors());

// Middleware de logs para depuração de IP
app.use((req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log('IP Identificado:', clientIp);
    next();
});

// Aplica o limite global
app.use(globalLimiter);

// ==========================================
// ROTAS
// ==========================================

import auth from './src/routes/auth/index.js';

// CORREÇÃO: Removido o `authLimiter daqui para não bloquear buscas e cadastros normais (search-client, register, etc.)
// Se você tiver uma rota específica de login (ex: /api/v1/login), aplique o authLimiter diretamente nela dentro do seu router.
app.use('/api/v1', auth);

// ==========================================
// INICIALIZAÇÃO
// ==========================================

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

export { app, pool };