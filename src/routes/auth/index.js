import { Router } from 'express';
import { pool } from '../../../server.js';
import sql from '../../functions/sql.js';
import tables from '../../utils/tables.js';
import axios from 'axios';

const router = Router();

async function checktoken(email, password) {
    const data = { type: "WEB", email, password };

    try {
        const response = await axios.post('https://cloud.segware.com.br/server/v3/auth', data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`[Segware Auth] Error: ${error.message}`);
        throw error;
    }
}

// Rota para checar se a origem é local (192.168.44.* ou localhost/IPv6)
router.get('/check-ip', (req, res) => {
    // Pega o IP considerando o proxy (X-Forwarded-For) ou a conexão direta (remoteAddress)
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log("Acesso IP:", clientIp);

    // Se estiver rodando localmente (IPv6 ::1 ou loopback IPv4 127.0.0.1), 
    // você pode decidir se quer permitir para testes locais:
    const isLocalhost = clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.includes('::ffff:127.0.0.1');

    // Verifica se o IP pertence à sub-rede 192.168.44.X ou se é local
    const isAllowed = isLocalhost || clientIp.includes('192.168.44.')  || clientIp.includes('192.168.34.')  || clientIp.includes('192.168.33.') || clientIp.includes('192.168.22.');

    return res.status(200).json({ isAllowed, ip: clientIp });
});

// Rota para buscar clientes/contas na Segware
router.get('/search-client', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: 'Termo de busca não informado' });

        const integrationResult = await sql.SELECT(tables.cad_integration.schema, {
            [tables.cad_integration.columns.enabled]: true,
            [tables.cad_integration.columns.type]: 'sigma_cloud',
        }).catch(error => console.error(`[Cron Integration Query] Error: ${error.message}`));

        if (!integrationResult || integrationResult.length === 0) {
            return res.status(404).json({ error: 'Configuração de integração Segware não encontrada.' });
        }

        const newToken = await checktoken(integrationResult[0].email, integrationResult[0].password);

        const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://cloud.segware.com.br/server/api/v2/2231/search?q=${encodeURIComponent(q)}`,
            headers: {
                'content-type': 'application/json;charset=UTF-8',
                'Authorization': `Bearer ${newToken}`,
            }
        };

        const response = await axios.request(config);
        return res.status(200).json(response.data);

    } catch (error) {
        console.error('Erro na busca Segware:', error.message);
        return res.status(500).json({ error: 'Erro ao consultar a API externa' });
    }
});

//POST
router.post('/register', async (req, res) => {
    try {
        const {
            cliente, device, name, phone, email,
            function: userFunction, cpf, rg, app = false,
            pass_alr, pass_app, pass_verbal
        } = req.body;

        console.log(req.body);

        await sql.INSERT(tables.cad_passwords.schema, {
            [tables.cad_passwords.columns.cliente]: cliente,
            [tables.cad_passwords.columns.device]: device,
            [tables.cad_passwords.columns.name]: name,
            [tables.cad_passwords.columns.phone]: phone,
            [tables.cad_passwords.columns.email]: email,
            [tables.cad_passwords.columns.function]: userFunction,
            [tables.cad_passwords.columns.cpf]: cpf,
            [tables.cad_passwords.columns.rg]: rg,
            [tables.cad_passwords.columns.app]: app,
            [tables.cad_passwords.columns.pass_alr]: pass_alr,
            [tables.cad_passwords.columns.pass_app]: pass_app,
            [tables.cad_passwords.columns.pass_verbal]: pass_verbal,
        });

        return res.status(200).json({ status: 'ok', message: "Cadastrado com sucesso!" });

    } catch (error) {
        console.error('Erro detectado: ', error, 'Rota: ', req.url);
        return res.status(400).json({ error: 'Erro ao processar a solicitação' });
    }
});

// Rota de listagem de todos os cadastros (Painel ADM)
router.get('/admin/passwords', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM ${tables.cad_passwords.schema} ORDER BY id DESC`);
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('Erro na consulta ADM:', error);
        return res.status(500).json({ error: 'Erro ao carregar dados cadastrados' });
    }
});

//PUT
router.patch('/admin/passwords/:id/status', async (req, res) => {
    const { id } = req.params;
    const { vist } = req.body;

    try {
        await pool.query(`UPDATE ${tables.cad_passwords.schema} SET vist = ${vist} WHERE id = ${id}`);

        return res.status(200).json({ message: 'Status atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro no banco de dados:', error);
        return res.status(500).json({ error: 'Erro ao atualizar o registro no banco.' });
    }
});

export default router;