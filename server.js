import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import http from 'http';
import { config as dotenvConfig } from 'dotenv';
import { rateLimit } from 'express-rate-limit'; // 1. Importação do rate-limit
import { pool } from './src/utils/index.js';

dotenvConfig();

const app = express();

app.set('trust proxy', 1); // 1 = confia em 1 proxy/ingress na frente

// ==========================================
// CONFIGURAÇÕES DE RATE LIMITING (PROTEÇÃO)
// ==========================================

// Configuração Global (aplica em todas as rotas)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de 15 minutos
    limit: 100, // Máximo de 100 requisições por IP a cada 15 min
    standardHeaders: true, // Retorna informação do limite nos headers `RateLimit-*`
    legacyHeaders: false, // Desativa os headers antigos `X-RateLimit-*`
    message: {
        status: 429,
        error: 'Muitas requisições vindas deste IP. Tente novamente em 15 minutos.'
    }
});

// Configuração Estrita para Autenticação (previne ataque de força bruta no Login)
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // Janela de 1 hora
    limit: 10, // Apenas 10 tentativas por IP a cada hora
    message: {
        status: 429,
        error: 'Muitas tentativas de login/autenticação. Tente novamente mais tarde.'
    }
});

// ==========================================
// MIDDLEWARES DA APLICAÇÃO
// ==========================================

// Aplica o bloqueio/limite global em todas as rotas
app.use(globalLimiter);

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(cors());

// Nota: Seu middleware customizado de CORS pode ser simplificado se usar apenas o pacote cors(),
// mas mantido para respeitar seu fluxo:
app.use((req, res, next) => {
    console.log('remoteAddress (TCP):', req.socket.remoteAddress);
    console.log('X-Forwarded-For:', req.headers['x-forwarded-for']);
    next();
});

// ==========================================
// ROTAS
// ==========================================

import auth from './src/routes/auth/index.js';

// Aplica o limiter mais estrito especificamente na rota de Auth
app.use('/api/v1', authLimiter, auth);
// Nota: Se suas rotas forem dentro de '/api/v1', ajuste o prefixo conforme necessário.

// ==========================================
// INICIALIZAÇÃO
// ==========================================

const PORT = process.env.PORT || 3000;
const MODE = process.env.MODE;
const HOST = process.env.ADDRESS;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

export { app, pool };