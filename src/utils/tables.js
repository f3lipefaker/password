const tables = {

    cad_passwords: {
        schema: 'cad_passwords',
        columns: {
            id: 'id',
            cliente: 'cliente',
            device: 'device',
            name: 'name',
            phone: 'phone',
            email: 'email',
            function: 'function',
            cpf: 'cpf',
            rg: 'rg',
            app: 'app',
            pass_alr: 'pass_alr',
            pass_app: 'pass_app',
            pass_verbal: 'pass_verbal'
        },
    },

    cad_integration: {
        schema: "cad_integration",
        columns: {
            id: "id",
            type: "type",
            enabled: "enabled",
            token: "token",
            email: "email",
            password: "password",
        },
    },
};

export default tables;