require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
    {
        name: 'stats',
        description: 'Показать статистику сервера'
    },
    {
        name: 'memberstats',
        description: 'Статистика участников сервера'
    },
    {
        name: 'channelstats',
        description: 'Статистика каналов сервера'
    },
    {
        name: 'rolelist',
        description: 'Показать список ролей сервера'
    },
    {
        name: 'botinfo',
        description: 'Информация о боте'
    },
    {
        name: 'dashboard',
        description: 'Ссылка на веб-панель статистики'
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Регистрация команд...');
        
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        
        console.log('✅ Команды успешно зарегистрированы!');
    } catch (error) {
        console.error('❌ Ошибка регистрации команд:', error);
    }
})();