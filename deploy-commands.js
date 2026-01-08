const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: 'status',
        description: 'Get the current status of a Minecraft server',
        options: [
            {
                name: 'server',
                description: 'The name of the server to check',
                type: 3, // STRING
                required: true,
                choices: [
                    {
                        name: 'PixelmonFlamacy',
                        value: 'PixelmonFlamacy'
                    }
                ]
            }
        ],
    },
    {
        name: 'ping',
        description: 'Check bot latency and status',
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();