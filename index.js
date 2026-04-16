const fs = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== CONFIG =====
const SHOP_CHANNEL_ID = "1494360495577108600";
const DRAGON_CHANNEL_ID = "1494336961601863831";
const LOG_CHANNEL_ID = "1494371990113353978";
const LINK_ROLE_ID = "1494385453145788476";
const GUILD_ID = "1480204997613457541";
// ==================

// ===== DATA =====
let money = {}, shopItems = [], links = {}, kills = {}, linkCodes = {};

// LOAD DATA
try { shopItems = JSON.parse(fs.readFileSync('shop.json')); } catch {}
try { money = JSON.parse(fs.readFileSync('money.json')); } catch {}
try { links = JSON.parse(fs.readFileSync('links.json')); } catch {}
try { kills = JSON.parse(fs.readFileSync('kills.json')); } catch {}

function saveAll() {
  fs.writeFileSync('shop.json', JSON.stringify(shopItems, null, 2));
  fs.writeFileSync('money.json', JSON.stringify(money, null, 2));
  fs.writeFileSync('links.json', JSON.stringify(links, null, 2));
  fs.writeFileSync('kills.json', JSON.stringify(kills, null, 2));
}

// ===== GENERATE CODE =====
function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ===== COMMANDES =====
const commands = [

  new SlashCommandBuilder().setName('shop').setDescription('Ouvrir le shop'),
  new SlashCommandBuilder().setName('profil').setDescription('Voir ton profil'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Classement argent'),
  new SlashCommandBuilder().setName('pvptop').setDescription('Classement PvP'),
  new SlashCommandBuilder().setName('link').setDescription('Lier Minecraft'),

  new SlashCommandBuilder()
    .setName('setuplinkpanel')
    .setDescription('Créer panel link')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Ajouter item')
    .addStringOption(o => o.setName('nom').setDescription('Nom').setRequired(true))
    .addIntegerOption(o => o.setName('prix').setDescription('Prix').setRequired(true))
    .addStringOption(o => o.setName('give').setDescription('Commande give').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {
  try {

    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    // ===== PANEL =====
    if (interaction.commandName === "setuplinkpanel") {

      const embed = new EmbedBuilder()
        .setTitle("🔗 Liaison Minecraft")
        .setDescription("Clique sur le bouton pour lier ton compte")
        .setColor(0x00ffcc);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("link_account")
          .setLabel("🔗 Lier mon compte")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: "✅ Panel créé", ephemeral: true });
    }

    // ===== BOUTON LINK =====
    if (interaction.isButton() && interaction.customId === "link_account") {

      const code = generateCode();
      linkCodes[code] = interaction.user.id;

      return interaction.reply({
        content: `🔗 Code : \`${code}\`\nTape en jeu : !link ${code}`,
        ephemeral: true
      });
    }

    // ===== PROFIL =====
    if (interaction.commandName === "profil") {
      if (!money[interaction.user.id]) money[interaction.user.id] = 200;

      return interaction.reply({
        content: `👤 ${interaction.user.username}\n💰 ${money[interaction.user.id]} runes`,
        ephemeral: true
      });
    }

    // ===== LINK COMMAND =====
    if (interaction.commandName === "link") {
      const code = generateCode();
      linkCodes[code] = interaction.user.id;

      return interaction.reply({
        content: `🔗 Code : \`${code}\`\nTape en jeu : !link ${code}`,
        ephemeral: true
      });
    }

    // ===== SHOP =====
    if (interaction.commandName === "shop") {

      if (interaction.channel.id !== SHOP_CHANNEL_ID) {
        return interaction.reply({ content: "❌ Mauvais salon", ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle("🛒 Shop")
        .setDescription(shopItems.length ? "Choisis un item" : "❌ Aucun item")
        .setColor(0x00ffcc);

      const row = new ActionRowBuilder();

      shopItems.forEach((item, i) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("buy_" + i)
            .setLabel(`${item.nom} (${item.prix})`)
            .setStyle(ButtonStyle.Primary)
        );
      });

      return interaction.reply({ embeds: [embed], components: shopItems.length ? [row] : [] });
    }

    // ===== ADD ITEM =====
    if (interaction.commandName === "additem") {
      const nom = interaction.options.getString('nom');
      const prix = interaction.options.getInteger('prix');
      const give = interaction.options.getString('give');

      shopItems.push({ nom, prix, give });
      saveAll();

      return interaction.reply("✅ Item ajouté !");
    }

    // ===== LEADERBOARD ARGENT =====
    if (interaction.commandName === "leaderboard") {

      const sorted = Object.entries(money).sort((a, b) => b[1] - a[1]).slice(0, 10);

      let desc = "";
      sorted.forEach((u, i) => {
        const medal = ["🥇","🥈","🥉"][i] || "🏅";
        desc += `${medal} <@${u[0]}> — ${u[1]} 💰\n`;
      });

      const embed = new EmbedBuilder()
        .setTitle("🏆 Classement des Runes")
        .setDescription(desc || "Vide")
        .setColor(0xFFD700);

      return interaction.reply({ embeds: [embed] });
    }

    // ===== PVP =====
    if (interaction.commandName === "pvptop") {

      const sorted = Object.entries(kills).sort((a, b) => b[1] - a[1]).slice(0, 10);

      let desc = "";
      sorted.forEach((p, i) => {
        const medal = ["🥇","🥈","🥉"][i] || "🏅";
        desc += `${medal} ${p[0]} — ${p[1]} kills\n`;
      });

      const embed = new EmbedBuilder()
        .setTitle("⚔️ Classement PvP")
        .setDescription(desc || "Aucun kill")
        .setColor(0xff0000);

      return interaction.reply({ embeds: [embed] });
    }

    // ===== ACHAT =====
    if (interaction.isButton() && interaction.customId.startsWith("buy_")) {

      const user = interaction.user.id;
      const mcName = links[user];

      if (!mcName) {
        return interaction.reply({ content: "❌ Fais /link", ephemeral: true });
      }

      if (!money[user]) money[user] = 200;

      const index = parseInt(interaction.customId.split("_")[1]);
      const item = shopItems[index];

      if (!item) return interaction.reply({ content: "❌ Erreur item", ephemeral: true });

      if (money[user] >= item.prix) {

        money[user] -= item.prix;
        saveAll();

        const cmd = "/" + item.give.replace("@p", mcName);

        const log = client.channels.cache.get(LOG_CHANNEL_ID);
        if (log) log.send(`🧾 ${mcName} a acheté ${item.nom}\n📦 ${cmd}`);

        return interaction.reply({
          content: `✅ Achat ${item.nom}`,
          ephemeral: true
        });

      } else {
        return interaction.reply({ content: "❌ Pas assez d'argent", ephemeral: true });
      }
    }

  } catch (e) {
    console.error(e);
  }
});

// ===== MESSAGE (MC) =====
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // LINK
  if (message.content.startsWith("!link")) {

    const code = message.content.split(" ")[1];

    if (linkCodes[code]) {

      const discordId = linkCodes[code];
      const mcName = message.author.username;

      links[discordId] = mcName;
      delete linkCodes[code];
      saveAll();

      const member = await message.guild.members.fetch(discordId);
      if (member) member.roles.add(LINK_ROLE_ID);

      message.channel.send(`✅ ${mcName} lié !`);
    }
  }

  // KILL
  if (message.content.includes("[KILL]")) {
    const killer = message.content.split(" ")[1];
    if (!kills[killer]) kills[killer] = 0;
    kills[killer]++;
    saveAll();
  }
});

// ===== REGISTER =====
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Bot prêt !");
});

client.login(process.env.TOKEN);
