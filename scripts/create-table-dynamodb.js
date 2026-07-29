const {
    CreateTableCommand,
    waitUntilTableExists,
} = require("@aws-sdk/client-dynamodb")

const { rawDynamoClient } = require("../src/database/dynamodb")

const tableName = "url_mappings";

async function createTable() {
    try {
        await rawDynamoClient.send(
            new CreateTableCommand({
                TableName: tableName,

                AttributeDefinitions: [
                    {
                        AttributeName: "code",
                        AttributeType: "S",
                    },
                ],

                KeySchema: [
                    {
                        AttributeName: "code",
                        KeyType: "HASH",
                    },
                ],

                BillingMode: "PAY_PER_REQUEST",
            }),
        );

        console.log(`Tabela ${tableName} criada.`);
    } catch (error) {
        if (
            error instanceof Error &&
            error.name === "ResourceInUseException"
        ) {
            console.log(`Tabela ${tableName} já existe.`);
        } else {
            throw error;
        }
    }

    await waitUntilTableExists(
        {
            client: rawDynamoClient,
            maxWaitTime: 60,
        },
        {
            TableName: tableName,
        },
    );
}

createTable().catch((error) => {
    console.error("Falha ao criar tabela:", error);
    process.exit(1);
});