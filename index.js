const fs = require('fs');
const {
  Client, GatewayIntentBits,
  SlashCommandBuilder, REST, Routes,
  PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== CONFIG =====
const GUILD_ID = "1480204997613457541";

const LOG_CHANNEL_ID = "1494371990113353978";          // logs-achat
const ADMIN_CHANNEL_ID = "1495023085366022245"; // salon alertes

const ADMIN_ROLE_ID = "1480214844677554176";
const MOD_ROLE_ID = "1482081844466946160";
const VIP_ROLE_ID = "1494408592441475234";

// ===== DATA =====
function load(file){
  try { return JSON.parse(fs.readFileSync(file)); }
  catch { return {}; }
}

let money = load('money.json');
let shop = load('shop.json');
let bank = load('bank.json');
let vip = load('vip.json');

// ===== SAVE =====
function save(){
fs.writeFileSync('money.json', JSON.stringify(money,null,2));
fs.writeFileSync('shop.json', JSON.stringify(shop,null,2));
fs.writeFileSync('bank.json', JSON.stringify(bank,null,2));
fs.writeFileSync('vip.json', JSON.stringify(vip,null,2));
}

function safe(u){
if(!money[u]) money[u]=0;
if(!bank[u]) bank[u]=0;
}

// ===== LOG EMBED =====
function log(title, desc){
const ch = client.channels.cache.get(LOG_CHANNEL_ID);
if(!ch) return;

ch.send({
embeds:[
new EmbedBuilder()
.setTitle(title)
.setDescription(desc)
.setColor(0x00ffcc)
.setTimestamp()
]
});
}

// ===== COMMANDES =====
const commands = [

new SlashCommandBuilder().setName('money').setDescription('Voir ton argent'),

new SlashCommandBuilder().setName('daily').setDescription('Récompense quotidienne'),

new SlashCommandBuilder().setName('shop').setDescription('Voir le shop'),

new SlashCommandBuilder()
.setName('additem')
.setDescription('Ajouter un item')
.addStringOption(o=>o.setName('nom').setDescription('Nom item').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

new SlashCommandBuilder()
.setName('deposit')
.setDescription('Mettre en banque')
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder()
.setName('withdraw')
.setDescription('Retirer banque')
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder()
.setName('appeladmin')
.setDescription('Signaler un problème')
.addStringOption(o=>o.setName('probleme').setDescription('Problème').setRequired(true)),

new SlashCommandBuilder()
.setName('vip')
.setDescription('Donner VIP')
.addUserOption(o=>o.setName('user').setDescription('Utilisateur').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction=>{
if(!interaction.isChatInputCommand() && !interaction.isButton()) return;

const user = interaction.user.id;
safe(user);

// ===== COMMANDES =====

// MONEY
if(interaction.commandName==="money"){
return interaction.reply(`💰 ${money[user]}`);
}

// DAILY
if(interaction.commandName==="daily"){
const gain = vip[user] ? 400 : 200;

money[user]+=gain;
save();

log("🎁 Daily",`${interaction.user.username} +${gain}`);

return interaction.reply(`🎁 +${gain}`);
}

// SHOP
if(interaction.commandName==="shop"){

if(Object.keys(shop).length===0)
return interaction.reply("❌ Shop vide");

const row = new ActionRowBuilder();
let count=0;

for(let item in shop){
row.addComponents(
new ButtonBuilder()
.setCustomId(`buy_${item}`)
.setLabel(`${item} (${shop[item]})`)
.setStyle(ButtonStyle.Primary)
);

count++;
if(count===5) break;
}

return interaction.reply({
content:"🛒 Shop",
components:[row]
});
}

// ADD ITEM
if(interaction.commandName==="additem"){
const n = interaction.options.getString('nom');
const p = interaction.options.getInteger('prix');

shop[n]=p;
save();

return interaction.reply("✅ item ajouté");
}

// DEPOSIT
if(interaction.commandName==="deposit"){
const a = interaction.options.getInteger('montant');

if(a<=0) return interaction.reply("❌ invalide");
if(money[user]<a) return interaction.reply("❌ pas assez");

money[user]-=a;
bank[user]+=a;

save();

log("🏦 Dépôt",`${interaction.user.username} ${a}`);

return interaction.reply(`🏦 ${a} déposé`);
}

// WITHDRAW
if(interaction.commandName==="withdraw"){
const a = interaction.options.getInteger('montant');

if(a<=0) return interaction.reply("❌ invalide");
if(bank[user]<a) return interaction.reply("❌ pas assez");

bank[user]-=a;
money[user]+=a;

save();

log("💸 Retrait",`${interaction.user.username} ${a}`);

return interaction.reply(`💸 ${a} retiré`);
}

// APPEL ADMIN
if(interaction.commandName==="appeladmin"){

const msg = interaction.options.getString('probleme');
const ch = client.channels.cache.get(ADMIN_CHANNEL_ID);

if(!ch) return interaction.reply("❌ salon introuvable");

ch.send(
`🚨 PROBLÈME SERVEUR
👤 ${interaction.user.username}
📝 ${msg}

<@&${ADMIN_ROLE_ID}> <@&${MOD_ROLE_ID}>`
);

return interaction.reply({content:"✅ envoyé",ephemeral:true});
}

// VIP
if(interaction.commandName==="vip"){

const target = interaction.options.getUser('user');
vip[target.id] = true;

const member = await interaction.guild.members.fetch(target.id);
await member.roles.add(VIP_ROLE_ID);

save();

return interaction.reply("👑 VIP donné");
}

// ===== BOUTONS SHOP =====
if(interaction.isButton()){

if(interaction.customId.startsWith("buy_")){

const item = interaction.customId.replace("buy_","");
const price = shop[item];

if(!price) return;

if(money[user]<price)
return interaction.reply({content:"❌ pas assez",ephemeral:true});

money[user]-=price;
save();

log("🧾 Achat",
`👤 ${interaction.user.username} a acheté ${item}
💰 ${price}`
);

return interaction.reply({content:`✅ acheté ${item}`,ephemeral:true});
}
}

});

// ===== REGISTER =====
const rest = new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('clientReady', async ()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id, GUILD_ID),
{ body: commands.map(c=>c.toJSON()) }
);
console.log("✅ BOT OPERATIONNEL");
});

client.login(process.env.TOKEN);
