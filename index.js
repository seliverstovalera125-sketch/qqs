require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, ChannelType, PermissionsBitField } = require('discord.js');
const express = require('express');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

// Express app для веб-панели
const app = express();
const PORT = process.env.PORT || 3000;

// Статистика серверов
let serverStats = {};

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API для статистики
app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        bot: client.user ? {
            username: client.user.username,
            id: client.user.id,
            guilds: client.guilds.cache.size
        } : null,
        servers: serverStats,
        totalServers: Object.keys(serverStats).length
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        bot: client.user ? 'online' : 'offline'
    });
});

// Веб-панель
app.get('/dashboard', (req, res) => {
    res.render('dashboard', { 
        servers: Object.values(serverStats),
        botUsername: client.user?.username || 'Bot',
        totalGuilds: client.guilds?.cache.size || 0,
        uptime: client.uptime || 0,
        dashboardUrl: process.env.DASHBOARD_URL || `http://localhost:${PORT}`
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Команды бота
client.once('ready', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log(`🌐 Serving ${client.guilds.cache.size} guilds`);
    
    // Статус бота
    client.user.setPresence({
        activities: [{ 
            name: `${client.guilds.cache.size} servers | /stats`, 
            type: ActivityType.Watching 
        }],
        status: 'online'
    });

    // Первоначальное обновление статистики
    await updateAllServerStats();
    
    // Обновление статистики каждые 5 минут
    setInterval(() => updateAllServerStats(), 300000);
    
    console.log(`🚀 Web dashboard: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`📈 API: http://localhost:${PORT}/api/stats`);
});

// Обновление статистики для всех серверов
async function updateAllServerStats() {
    console.log('🔄 Updating server statistics...');
    const promises = client.guilds.cache.map(guild => updateServerStats(guild));
    await Promise.all(promises);
    console.log(`✅ Updated ${client.guilds.cache.size} servers`);
}

// Обновление статистики для конкретного сервера
async function updateServerStats(guild) {
    try {
        await guild.members.fetch();
        await guild.channels.fetch();
        
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humans = totalMembers - bots;
        
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        
        const roles = guild.roles.cache.size;
        const emojis = guild.emojis.cache.size;
        const boosts = guild.premiumSubscriptionCount || 0;
        
        serverStats[guild.id] = {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 256, dynamic: true }),
            owner: guild.ownerId,
            created: guild.createdAt.toISOString(),
            region: guild.preferredLocale,
            verification: guild.verificationLevel,
            stats: {
                members: {
                    total: totalMembers,
                    online: onlineMembers,
                    humans: humans,
                    bots: bots,
                    percentageOnline: totalMembers > 0 ? Math.round((onlineMembers / totalMembers) * 100) : 0
                },
                channels: {
                    text: textChannels,
                    voice: voiceChannels,
                    categories: categories,
                    total: textChannels + voiceChannels + categories
                },
                other: {
                    roles: roles,
                    emojis: emojis,
                    boosts: boosts,
                    tier: guild.premiumTier
                }
            },
            updated: new Date().toISOString()
        };
        
        return serverStats[guild.id];
    } catch (error) {
        console.error(`❌ Error updating stats for ${guild.name}:`, error.message);
        return null;
    }
}

// Обработка команд
client.on('interactionCreate', handleInteraction);

async function handleInteraction(interaction) {
    if (!interaction.isCommand()) return;

    const { commandName, guild } = interaction;

    switch (commandName) {
        case 'stats':
            await handleStatsCommand(interaction, guild);
            break;
        case 'memberstats':
            await handleMemberStatsCommand(interaction, guild);
            break;
        case 'channelstats':
            await handleChannelStatsCommand(interaction, guild);
            break;
        case 'rolelist':
            await handleRoleListCommand(interaction, guild);
            break;
        case 'botinfo':
            await handleBotInfoCommand(interaction);
            break;
        case 'dashboard':
            await handleDashboardCommand(interaction);
            break;
    }
}

// Обработчики команд
async function handleStatsCommand(interaction, guild) {
    const stats = await updateServerStats(guild);
    
    if (!stats) {
        return interaction.reply({ content: '❌ Failed to fetch server stats.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(`📊 ${guild.name} Statistics`)
        .setColor('#5865F2')
        .setThumbnail(guild.iconURL({ size: 256, dynamic: true }))
        .addFields(
            { 
                name: '👥 Members', 
                value: `Total: ${stats.stats.members.total}\nOnline: ${stats.stats.members.online}\nHumans: ${stats.stats.members.humans}\nBots: ${stats.stats.members.bots}\nOnline: ${stats.stats.members.percentageOnline}%`,
                inline: true 
            },
            { 
                name: '📁 Channels', 
                value: `Text: ${stats.stats.channels.text}\nVoice: ${stats.stats.channels.voice}\nCategories: ${stats.stats.channels.categories}\nTotal: ${stats.stats.channels.total}`,
                inline: true 
            },
            { 
                name: '✨ Other', 
                value: `Roles: ${stats.stats.other.roles}\nEmojis: ${stats.stats.other.emojis}\nBoosts: ${stats.stats.other.boosts}\nTier: ${stats.stats.other.tier}`,
                inline: false 
            }
        )
        .setFooter({ text: `Server ID: ${guild.id}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// Другие обработчики команд (memberstats, channelstats и т.д.)
// ... остальной код обработчиков команд ...

// Форматирование времени
function formatUptime(ms) {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}

// Запуск Express сервера
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ HTTP server closed');
        client.destroy();
        console.log('✅ Discord client destroyed');
        process.exit(0);
    });
});

// Запуск бота
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});