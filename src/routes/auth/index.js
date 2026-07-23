import { Router } from 'express';
import { pool } from '../../../server.js';
import sql from '../../functions/sql.js';
import tables from '../../utils/tables.js';
import axios from 'axios';

const router = Router();

//GET 
// Rota para checar se a origem é local (192.168.44.*)
router.get('/check-ip', (req, res) => {
    // Pega o IP do cliente (considerando proxies/headers)
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    console.log("Acesso: ", clientIp);

    // Verifica se o IP pertence à sub-rede 192.168.44.X
    const isAllowed = clientIp.includes('192.168.44.') || '192.168.34.'

    return res.status(200).json({ isAllowed, ip: clientIp });
});

// Rota para buscar clientes/contas na Segware
router.get('/search-client', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: 'Termo de busca não informado' });

        const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://cloud.segware.com.br/server/api/v2/2231/search?q=${encodeURIComponent(q)}`,
            headers: {
                'Authorization': `Bearer ${process.env.SEGWARE_TOKEN}`,
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
    const { vist } = req.body; // Espera um valor booleano (true ou false)

    try {
        // Exemplo com query SQL tradicional:
        await pool.query(`UPDATE ${tables.cad_passwords.schema} SET vist = ${vist} WHERE id = ${id}`);

        return res.status(200).json({ message: 'Status atualizado com sucesso!' });

        // Request URL
        // https://cloud.segware.com.br/server/api/v2/2231/accounts/1381834/usersAndContact
        // {
        //     "email": "felipe@viptech.com.br",
        //     "nextel": "senha4",
        //     "allPartitions": true,
        //     "phone01": "44991142300",
        //     "taxpayerIdentification": "00000",
        //     "identificationNumber": "rg",
        //     "receivesIvrCall": false,
        //     "receivesIvrWhatsappNotification": false,
        //     "whatsappPhone01": false,
        //     "countryCodePhone01": 55,
        //     "whatsappPhone02": false,
        //     "countryCodePhone02": 55,
        //     "list": 0,
        //     "questionPassword": "",
        //     "answerPassword": "senhav",
        //     "showUserAsContact": true,
        //     "countrySiglaPhone01": "BR",
        //     "countrySiglaPhone02": "BR",
        //     "contactReason": [],
        //     "partitionPanelCode": [],
        //     "name": "Felipe Borges",
        //     "priority": 0,
        //     "id": 15592843,
        //     "phone02": "44991142300"
        // }

    } catch (error) {
        console.error('Erro no banco de dados:', error);
        return res.status(500).json({ error: 'Erro ao atualizar o registro no banco.' });
    }
});


export default router;