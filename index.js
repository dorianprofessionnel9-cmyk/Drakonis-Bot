const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let money = {}; // banque simple

// COMMANDES
const commands = [
  new SlashCommandBuilder().setName('shop').setDescription('Ouvrir le shop'),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );
});

// INTERACTIONS
client.on('interactionCreate', async interaction => {

  try {

    // COMMANDE /shop
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "shop") {

        await interaction.deferReply(); // 🔥 IMPORTANT

        const embed = new EmbedBuilder()
          .setTitle("🛒 Shop du serveur")
          .setDescription("Clique pour acheter")
          .setColor(0x00ffcc);

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId("buy_sword")
              .setLabel("⚔️ Épée (100)")
              .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
              .setCustomId("buy_food")
              .setLabel("🍖 Nourriture (50)")
              .setStyle(ButtonStyle.Success)
          );

        await interaction.editReply({ embeds: [embed], components: [row] });
      }
    }

    // BOUTONS
    if (interaction.isButton()) {

      const user = interaction.user.id;

      if (!money[user]) money[user] = 200;

      if (interaction.customId === "buy_sword") {
        if (money[user] >= 100) {
          money[user] -= 100;

          await interaction.reply({ content: "⚔️ Achat réussi ! Argent restant: " + money[user], ephemeral: true });
        } else {
          await interaction.reply({ content: "❌ Pas assez d'argent", ephemeral: true });
        }
      }

      if (interaction.customId === "buy_food") {
        if (money[user] >= 50) {
          money[user] -= 50;

          await interaction.reply({ content: "🍖 Achat réussi ! Argent restant: " + money[user], ephemeral: true });
        } else {
          await interaction.reply({ content: "❌ Pas assez d'argent", ephemeral: true });
        }
      }
    }

  } catch (err) {
    console.error(err);
  }
});
    // ÉPÉE
    if (interaction.customId === "buy_sword") {
      if (money[user] >= 100) {
        money[user] -= 100;

        console.log("Donner épée à joueur");

        await interaction.reply({ content: "⚔️ Achat réussi ! Argent restant: " + money[user], ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Pas assez d'argent", ephemeral: true });
      }
    }

    // NOURRITURE
    if (interaction.customId === "buy_food") {
      if (money[user] >= 50) {
        money[user] -= 50;

        console.log("Donner nourriture");

        await interaction.reply({ content: "🍖 Achat réussi ! Argent restant: " + money[user], ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Pas assez d'argent", ephemeral: true });
      }
    }
  }
});

// 🔥 ANNONCES DRAGON (Minecraft → Discord)
client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content.includes("[DRAGON]")) {

    const channel = client.channels.cache.get("1494336961601863831");

    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle("🐉 Alerte Dragon")
        .setDescription(message.content)
        .setColor(0x8B0000);

      channel.send({
        content: "@everyone",
        embeds: [embed]
      });
    }
  }
});

client.login(process.env.TOKEN);
