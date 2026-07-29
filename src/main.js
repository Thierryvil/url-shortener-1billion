const HyperExpress = require('hyper-express');
const { generateBase62 } = require('./utils');
const { createUrlSchema } = require('./schemas');
const { env } = require('./config');


const webserver = new HyperExpress.Server();

webserver.get('/health', async (request, response) => {
    response.json({ status: 'ok' }).status(200);
});

webserver.get('/:code', async (request, response) => {
    const { code } = request.params;

    response.redirect(`http://localhost/${code}`).status(302);
})

webserver.post('/api/v1/urls', async (request, response) => {
    const { error, success, data } = createUrlSchema.safeParse(await request.json());

    if (error) {
        return response.json({ error: { message: "INVALID_URL" } }).status(400);
    }

    const { url } = data

    const code = generateBase62();

    response
        .json({
            code,
            short_url: `http://localhost/${code}`,
            original_url: url
        })
        .status(201);
})

webserver.listen(env.PORT, env.HOST)
    .then((socket) => console.log(`Webserver started on port ${env.PORT}`))
    .catch((error) => console.log(`Failed to start webserver on port ${env.PORT}`));