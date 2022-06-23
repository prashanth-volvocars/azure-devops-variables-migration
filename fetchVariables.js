require('dotenv').config();
const axios = require('axios');
const { stringify } = require('envfile');
const { writeFileSync } = require('fs');
const mkdirp = require('mkdirp');

(async () => {
    const definitionsUrl = "https://vsrm.dev.azure.com/volvocargroup/DSPA/_apis/release/definitions?api-version=5.1&path="+ process.env.DEFINITION_PATH;

    console.log(definitionsUrl);

    const response = await axios.get(definitionsUrl, {
        auth: {
        username: process.env.USERNAME,
        password: process.env.PASSWORD
        }
    });

    const definitions = response.data?.value || [];

    const definitionIds = definitions.map((definition) => {
        return definition.id;
    });

    console.log(definitionIds);

    const url = "https://vsrm.dev.azure.com/volvocargroup/DSPA/_apis/release/definitions/{definitionId}?api-version=5.1";

    definitionIds.map(async (defintionId) => {
        const url_to_call = url.replace("{definitionId}", defintionId);
        console.log(url_to_call);
        const response = await axios.get(url_to_call, {
            auth: {
            username: process.env.USERNAME,
            password: process.env.PASSWORD
            }
        });
        const data = response.data || {};
        const project = data.name || "";
        // console.log(data);
        // console.log(flattened_variables);
        await writeVariablesToFile(data, project);
        const environments = data.environments || [];
        // console.log(environments);
        environments.map(async (environment) => {
            const env_name = environment.name;
            await writeVariablesToFile(environment, project, env_name);
        })
    })

    const getFlattenedVariables = (variables) => {
        return Object.keys(variables).reduce((flattened_variables, variable_name) => {
            const value_obj = variables[variable_name];
            const value = value_obj.value;
            if (value) {
                flattened_variables.variables[variable_name] = value;
            } else if (value_obj.isSecret) {
                flattened_variables.secrets[variable_name] = "";
            }
            return flattened_variables;
        }, {
            variables: {},
            secrets: {}
        });
    }

    const writeVariablesToFile = async (data, project, env_name) => {
        const variables = data.variables || {};
        const flattened_variables = getFlattenedVariables(variables);
        const filePath = (env_name) ? `${__dirname}/${project}/${env_name}` : `${__dirname}/${project}`;
        const file = (env_name) ? `${__dirname}/${project}/${env_name}/.env` : `${__dirname}/${project}/.env`;
        const env_string = stringify(flattened_variables.variables);
        await mkdirp(filePath);
        writeFileSync(file, env_string);
    }
})();