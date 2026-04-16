const fs = require('fs');
const {
  Client, GatewayIntentBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  SlashCommandBuilder, REST, Routes,
  PermissionFlagsBits,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ===== CONFIG =====
const SHOP_CHANNEL_ID = "1494360495577108600";
const DRAGON_CHANNEL_ID = "1494336961601863831";
const LOG_CHANNEL_ID = "1494371990113353978";
const LINK_ROLE_ID = "1494385453145788476";
const GUILD_ID = "1480204997613457541";
const INTEREST_RATE = 0.05;
// ==================

// ===== DATA =====
let money = {}, shopItems = [], links = {}, kills = {}, bank = {}, linkCodes = {};

try { shopItems = JSON.parse(fs.readFileSync('shop.json')); } catch {}
try { money = JSON.parse(fs.readFileSync('money.json')); } catch {}
try { links = JSON.parse(fs.readFileSync('links.json')); } catch {}
try { kills = JSON.parse(fs.readFileSync('kills.json')); } catch {}
try { bank = JSON.parse(fs.readFileSync('bank.json')); } catch {}

function saveAll() {
  fs.writeFileSync('shop.json', JSON.stringify(shopItems, null, 2));
  fs.writeFileSync('money.json', JSON.stringify(money, null, 2));
  fs.writeFileSync('links.json', JSON.stringify(links, null, 2));
  fs.writeFileSync('kills.json', JSON.stringify(kills, null, 2));
  fs.writeFileSync('bank.json', JSON.stringify(bank, null, 2));
}

// ===== CODE LINK =====
function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ===== INTÉRÊTS =====
function applyInterest() {
  for (const user in bank) {
    const gain = Math.floor(bank[user] * INTEREST_RATE);
    if (gain > 0) bank[user] += gain;
  }
  saveAll();

  const log = client.channels.cache.get(LOG_CHANNEL_ID);
  if (log) log.send("💎 Intérêts bancaires distribués !");
}

// ===== COMMANDES =====
const commands = [
  new SlashCommandBuilder().setName('shop').setDescription('Shop'),
  new SlashCommandBuilder().setName('profil').setDescription('Profil'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Classement argent'),
  new SlashCommandBuilder().setName('pvptop').setDescription('Classement PvP'),
  new SlashCommandBuilder().setName('link').setDescription('Lier Minecraft'),
  new SlashCommandBuilder().setName('bank').setDescription('Banque'),

  new SlashCommandBuilder()
    .setName('setuplinkpanel')
    .setDescription('Créer panel link')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Ajouter item')
    .addStringOption(o => o.setName('nom').setRequired(true))
    .addIntegerOption(o => o.setName('prix').setRequired(true))
    .addStringOption(o => o.setName('give').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {
  try {

    // ===== PANEL =====
    if (interaction.commandName === "setuplinkpanel") {
      const embed = new EmbedBuilder()
        .setTitle("🔗 Liaison Minecraft")
        .setDescription("Clique pour lier ton compte")
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

    // ===== BANK MENU =====
    if (interaction.commandName === "bank") {

      const embed = new EmbedBuilder()
        .setTitle("🏦 Banque")
        .setDescription("Choisis une action")
        .setColor(0x00ffcc);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("deposit_modal").setLabel("📥 Déposer").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("withdraw_modal").setLabel("📤 Retirer").setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ===== MODAL OPEN =====
    if (interaction.isButton()) {

      if (interaction.customId === "deposit_modal" || interaction.customId === "withdraw_modal") {

        const modal = new ModalBuilder()
          .setCustomId(interaction.customId === "deposit_modal" ? "deposit_submit" : "withdraw_submit")
          .setTitle("💰 Banque");

        const input = new TextInputBuilder()
          .setCustomId("amount")
          .setLabel("Montant")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }
    }

    // ===== MODAL SUBMIT =====
    if (interaction.isModalSubmit()) {

      const user = interaction.user.id;
      const amount = parseInt(interaction.fields.getTextInputValue("amount"));

      if (!money[user]) money[user] = 0;
      if (!bank[user]) bank[user] = 0;

      if (isNaN(amount) || amount <= 0) {
        return interaction.reply({ content: "❌ Montant invalide", ephemeral: true });
      }

      if (interaction.customId === "deposit_submit") {

        if (money[user] < amount) {
          return interaction.reply({ content: "❌ Pas assez", ephemeral: true });
        }

        money[user] -= amount;
        bank[user] += amount;

      } else {

        if (bank[user] < amount) {
          return interaction.reply({ content: "❌ Pas assez en banque", ephemeral: true });
        }

        bank[user] -= amount;
        money[user] += amount;
      }

      saveAll();

      return interaction.reply({
        content: `💰 Cash: ${money[user]}\n🏦 Banque: ${bank[user]}`,
        ephemeral: true
      });
    }

    // ===== PROFIL =====
    if (interaction.commandName === "profil") {
      const u = interaction.user.id;
      if (!money[u]) money[u] = 0;
      if (!bank[u]) bank[u] = 0;

      return interaction.reply({
        content: `💰 Cash: ${money[u]}\n🏦 Banque: ${bank[u]}`,
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
        .setDescription(shopItems.length ? "Choisis" : "Vide");

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

    // ===== ACHAT =====
    if (interaction.isButton() && interaction.customId.startsWith("buy_")) {

      const user = interaction.user.id;
      const mc = links[user];

      if (!mc) return interaction.reply({ content: "❌ Fais /link", ephemeral: true });

      if (!money[user]) money[user] = 0;

      const item = shopItems[interaction.customId.split("_")[1]];

      if (money[user] < item.prix) {
        return interaction.reply({ content: "❌ Pas assez", ephemeral: true });
      }

      money[user] -= item.prix;
      saveAll();

      const cmd = "/" + item.give.replace("@p", mc);

      const log = client.channels.cache.get(LOG_CHANNEL_ID);
      if (log) log.send(`🧾 ${mc} → ${cmd}`);

      return interaction.reply({ content: "✅ Achat", ephemeral: true });
    }

    // ===== ADD ITEM =====
    if (interaction.commandName === "additem") {
      shopItems.push({
        nom: interaction.options.getString('nom'),
        prix: interaction.options.getInteger('prix'),
        give: interaction.options.getString('give')
      });
      saveAll();
      return interaction.reply("✅ Ajouté");
    }

    // ===== LINK =====
    if (interaction.commandName === "link") {
      const code = generateCode();
      linkCodes[code] = interaction.user.id;

      return interaction.reply({
        content: `Code : ${code}\n!link ${code}`,
        ephemeral: true
      });
    }

    // ===== LEADERBOARD =====
    if (interaction.commandName === "leaderboard") {
      const sorted = Object.entries(money).sort((a,b)=>b[1]-a[1]).slice(0,10);
      let desc = "";
      sorted.forEach((u,i)=>{
        desc += `${["🥇","🥈","🥉"][i]||"🏅"} <@${u[0]}> — ${u[1]}\n`;
      });
      return interaction.reply({ embeds:[new EmbedBuilder().setTitle("🏆").setDescription(desc||"Vide")] });
    }

    // ===== PVP =====
    if (interaction.commandName === "pvptop") {
      const sorted = Object.entries(kills).sort((a,b)=>b[1]-a[1]).slice(0,10);
      let desc = "";
      sorted.forEach((p,i)=>{
        desc += `${["🥇","🥈","🥉"][i]||"🏅"} ${p[0]} — ${p[1]}\n`;
      });
      return interaction.reply({ embeds:[new EmbedBuilder().setTitle("⚔️").setDescription(desc||"Vide")] });
    }

  } catch (e) {
    console.error(e);
  }
});

// ===== MESSAGE =====
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.startsWith("!link")) {
    const code = message.content.split(" ")[1];

    if (linkCodes[code]) {
      const id = linkCodes[code];
      links[id] = message.author.username;
      delete linkCodes[code];
      saveAll();

      const member = await message.guild.members.fetch(id);
      if (member) member.roles.add(LINK_ROLE_ID);

      message.channel.send("✅ Compte lié !");
    }
  }

  if (message.content.includes("[KILL]")) {
    const killer = message.content.split(" ")[1];
    if (!kills[killer]) kills[killer]=0;
    kills[killer]++;
    saveAll();
  }
});

// ===== INTEREST AUTO =====
setInterval(() => applyInterest(), 3600000);

// ===== REGISTER =====
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Bot prêt");
});

client.login(process.env.TOKEN);
