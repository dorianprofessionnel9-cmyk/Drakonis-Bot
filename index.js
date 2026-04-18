const fs = require('fs');
const {
  Client, GatewayIntentBits,
  SlashCommandBuilder, REST, Routes,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== CONFIG =====
const GUILD_ID = "1480204997613457541";
const LOG_CHANNEL_ID = "1494371990113353978";
const ADMIN_ROLE_ID = "1480214844677554176";
const MOD_ROLE_ID = "1482081844466946160";
const VIP_ROLE_ID = "1494408592441475234";

// ===== LOAD =====
function load(f){ try{return JSON.parse(fs.readFileSync(f));}catch{return {}} }

let money = load('money.json');
let shop = load('shop.json');
let vip = load('vip.json');
let teams = load('teams.json');
let mailbox = load('mailbox.json');
let wars = load('wars.json');
let link = load('link.json');
let linkCodes = load('linkcodes.json');

// ===== SAVE =====
function save(){
fs.writeFileSync('money.json',JSON.stringify(money,null,2));
fs.writeFileSync('shop.json',JSON.stringify(shop,null,2));
fs.writeFileSync('vip.json',JSON.stringify(vip,null,2));
fs.writeFileSync('teams.json',JSON.stringify(teams,null,2));
fs.writeFileSync('mailbox.json',JSON.stringify(mailbox,null,2));
fs.writeFileSync('wars.json',JSON.stringify(wars,null,2));
fs.writeFileSync('link.json',JSON.stringify(link,null,2));
fs.writeFileSync('linkcodes.json',JSON.stringify(linkCodes,null,2));
}

function safe(u){
if(!money[u]) money[u]=0;
if(!mailbox[u]) mailbox[u]=[];
}

// ===== PERM =====
function isStaff(member){
return member.roles.cache.has(ADMIN_ROLE_ID) || member.roles.cache.has(MOD_ROLE_ID);
}

// ===== LOG =====
function log(title,desc){
const ch = client.channels.cache.get(LOG_CHANNEL_ID);
if(!ch) return;
ch.send({embeds:[new EmbedBuilder().setTitle(title).setDescription(desc)]});
}

// ===== SHOP PAGE =====
function shopPage(cat,page){
const items = Object.entries(shop[cat] || {});
const perPage = 5;
const start = page*perPage;
const current = items.slice(start,start+perPage);

const row = new ActionRowBuilder();
const nav = new ActionRowBuilder();

current.forEach(([name,price])=>{
row.addComponents(
new ButtonBuilder()
.setCustomId(`buy_${cat}_${name}`)
.setLabel(`${name} (${price})`)
.setStyle(ButtonStyle.Primary)
);
});

nav.addComponents(
new ButtonBuilder().setCustomId(`prev_${cat}_${page}`).setLabel("◀️").setStyle(ButtonStyle.Secondary).setDisabled(page===0),
new ButtonBuilder().setCustomId(`next_${cat}_${page}`).setLabel("▶️").setStyle(ButtonStyle.Secondary).setDisabled(start+perPage>=items.length),
new ButtonBuilder().setCustomId("back").setLabel("⬅️").setStyle(ButtonStyle.Danger)
);

return {content:`🛒 ${cat} (page ${page+1})`,components:[row,nav]};
}

// ===== COMMANDES =====
const commands = [

new SlashCommandBuilder().setName('money').setDescription('Voir ton argent'),

new SlashCommandBuilder()
.setName('pay')
.setDescription('Envoyer de l’argent')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder()
.setName('addmoney')
.setDescription('Ajouter argent (admin)')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder()
.setName('removemoney')
.setDescription('Retirer argent (admin)')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('shop').setDescription('Ouvrir le shop'),

new SlashCommandBuilder()
.setName('additem')
.setDescription('Ajouter item au shop')
.addStringOption(o=>o.setName('categorie').setDescription('Catégorie').setRequired(true))
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true)),

new SlashCommandBuilder()
.setName('vip')
.setDescription('Donner VIP')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true)),

new SlashCommandBuilder()
.setName('link')
.setDescription('Obtenir un code de liaison'),

new SlashCommandBuilder()
.setName('validatelink')
.setDescription('Valider un joueur')
.addStringOption(o=>o.setName('code').setDescription('Code').setRequired(true))
.addStringOption(o=>o.setName('pseudo').setDescription('Pseudo MC').setRequired(true))
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))

];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {

const user = interaction.user.id;
safe(user);

// ===== COMMANDES =====
if(interaction.isChatInputCommand()){

if(interaction.commandName==="money")
return interaction.reply(`💰 ${money[user]}`);

if(interaction.commandName==="pay"){
const t = interaction.options.getUser('user');
const a = interaction.options.getInteger('montant');
if(a<=0 || money[user]<a) return interaction.reply("❌");
money[user]-=a;
money[t.id]=(money[t.id]||0)+a;
save();
return interaction.reply("💸 envoyé");
}

if(["addmoney","removemoney"].includes(interaction.commandName)){
if(!isStaff(interaction.member)) return interaction.reply("❌");
const t = interaction.options.getUser('user');
const a = interaction.options.getInteger('montant');
if(interaction.commandName==="addmoney") money[t.id]=(money[t.id]||0)+a;
if(interaction.commandName==="removemoney") money[t.id]=Math.max(0,(money[t.id]||0)-a);
save();
return interaction.reply("OK");
}

// ===== LINK =====
if(interaction.commandName==="link"){
const code = Math.random().toString(36).substring(2,8).toUpperCase();
linkCodes[code] = { user: interaction.user.id, created: Date.now() };
save();

return interaction.reply({
content:`🔑 Ton code : **${code}**

📩 Envoie dans ton ticket :
Pseudo MC :
Code : ${code}`,
ephemeral:true
});
}

// ===== VALIDATE =====
if(interaction.commandName==="validatelink"){
if(!isStaff(interaction.member)) return interaction.reply("❌");

const code = interaction.options.getString('code');
const pseudo = interaction.options.getString('pseudo');
const userTarget = interaction.options.getUser('user');

if(!linkCodes[code]) return interaction.reply("❌ code invalide");

if(Date.now() - linkCodes[code].created > 300000){
delete linkCodes[code]; save();
return interaction.reply("❌ code expiré");
}

link[userTarget.id] = pseudo;
delete linkCodes[code];
save();

return interaction.reply(`✅ ${pseudo} lié`);
}

}

// ===== BUTTONS =====
if(interaction.isButton()){
// (ton code boutons reste identique)
}

});

// ===== REGISTER =====
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('clientReady',async()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id,GUILD_ID),
{body:commands.map(c=>c.toJSON())}
);
console.log("BOT READY");
});

client.login(process.env.TOKEN);
