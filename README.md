# 🧩 Template Backend (Node.js + Express + PostgreSQL)

Este repositório serve como um **template base para projetos backend** utilizando **Node.js**, **Express**, **PostgreSQL** e **dotenv** para gerenciamento de variáveis de ambiente.
Ideal para iniciar rapidamente novas APIs RESTful com uma estrutura simples e eficiente.

---

## 🚀 Tecnologias Utilizadas

* [Node.js](https://nodejs.org/)
* [Express](https://expressjs.com/)
* [PostgreSQL](https://www.postgresql.org/)
* [pg](https://www.npmjs.com/package/pg) — driver PostgreSQL para Node.js
* [dotenv](https://www.npmjs.com/package/dotenv) — variáveis de ambiente
* [cors](https://www.npmjs.com/package/cors) — controle de acesso
* [body-parser](https://www.npmjs.com/package/body-parser) — parse do corpo das requisições
* [nodemon](https://www.npmjs.com/package/nodemon) — recarregamento automático em ambiente de desenvolvimento

---

## 📦 Estrutura do Projeto

```bash
template-backend/
├── server.js             # Ponto de entrada principal
├── .env                  # Variáveis de ambiente
├── package.json          # Configuração do projeto
├── publish/
│   └── update.sh         # Script para atualização/deploy
└── src/
    ├── routes/           # Rotas da aplicação
    ├── controllers/      # Lógica de negócio
    ├── models/           # Conexão e queries com o banco
    └── config/           # Configurações (ex: db.js)
```

> 💡 A estrutura acima é apenas uma sugestão — ajuste conforme as necessidades do seu projeto.

---

## ⚙️ Configuração e Instalação

1. **Clone o repositório**

   ```bash
   git clone https://github.com/seu-usuario/template-backend.git
   cd template-backend
   ```

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Configure o arquivo `.env`**

   ```bash
   touch .env
   ```

   Exemplo de configuração:

   ```
   PORT=3000
   DATABASE_URL=postgres://usuario:senha@localhost:5432/seu_banco
   ```

4. **Inicie o servidor em modo desenvolvimento**

   ```bash
   npm run dev
   ```

   O servidor será iniciado com **nodemon**, que recarrega automaticamente as alterações.

5. **Executar em produção**

   ```bash
   npm start
   ```

---

## 🧰 Scripts Disponíveis

| Comando          | Descrição                                                              |
| ---------------- | ---------------------------------------------------------------------- |
| `npm run dev`    | Inicia o servidor em modo desenvolvimento com **nodemon**              |
| `npm start`      | Inicia o servidor normalmente com **node**                             |
| `npm run update` | Executa o script `publish/update.sh` (útil para deploys automatizados) |

---

## 🗄️ Conexão com Banco de Dados

A conexão com o PostgreSQL é feita usando o pacote `pg`.
Certifique-se de ter o banco configurado e a variável `DATABASE_URL` definida no `.env`.

Exemplo de configuração (`src/config/db.js`):

```js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
```

---

## 📡 Exemplo de Endpoint

```js
import express from 'express';
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ message: 'API funcionando corretamente 🚀' });
});

export default router;
```

---

## 🧑‍💻 Autor

Desenvolvido por **[Felipe Borges]**
📧 Contato: [[fbdomingoss@gmail.com](mailto:fbdomingoss@gmail.com)]
🌐 GitHub: [https://github.com/f3lipefaker](https://github.com/f3lipefaker)

---

## 🪪 Licença

Este projeto está licenciado sob a licença **ISC** — veja o arquivo `LICENSE` para mais detalhes.
