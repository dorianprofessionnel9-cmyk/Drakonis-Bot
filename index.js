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
let bank = load('bank.json');
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
fs.writeFileSync('bank.json',JSON.stringify(bank,null,2));
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
if(!bank[u]) bank[u]=0;
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

// ===== COMMANDES =====
const commands = [

new SlashCommandBuilder().setName('money').setDescription('Voir argent'),
new SlashCommandBuilder().setName('daily').setDescription('Récompense quotidienne'),
new SlashCommandBuilder().setName('bank').setDescription('Banque'),

new SlashCommandBuilder()
.setName('pay')
.setDescription('Envoyer argent')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder()
.setName('addmoney')
.setDescription('Admin add')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder()
.setName('removemoney')
.setDescription('Admin remove')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder()
.setName('appeladmin')
.setDescription('Signaler problème')
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder().setName('shop').setDescription('Shop'),

new SlashCommandBuilder()
.setName('additem')
.setDescription('Ajouter item')
.addStringOption(o=>o.setName('categorie').setDescription('Catégorie').setRequired(true))
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true)),

new SlashCommandBuilder().setName('leaderboard').setDescription('Top argent'),

new SlashCommandBuilder()
.setName('createteam')
.setDescription('Créer team')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addStringOption(o=>o.setName('objectif').setDescription('Objectif').setRequired(true))
.addStringOption(o=>o.setName('base').setDescription('Base')),

new SlashCommandBuilder().setName('teaminfo').setDescription('Info team'),
new SlashCommandBuilder().setName('deleteteam').setDescription('Delete team'),

new SlashCommandBuilder()
.setName('guerre')
.setDescription('Déclarer guerre')
.addStringOption(o=>o.setName('team').setDescription('Nom').setRequired(true)),

new SlashCommandBuilder().setName('acceptguerre').setDescription('Accepter guerre'),
new SlashCommandBuilder().setName('leaderboardguerre').setDescription('Top guerre'),

new SlashCommandBuilder()
.setName('sendmail')
.setDescription('Envoyer mail')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder().setName('mail').setDescription('Voir mail'),

new SlashCommandBuilder().setName('link').setDescription('Code link'),

new SlashCommandBuilder()
.setName('validatelink')
.setDescription('Valider link')
.addStringOption(o=>o.setName('code').setDescription('Code').setRequired(true))
.addStringOption(o=>o.setName('pseudo').setDescription('Pseudo').setRequired(true))
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))

];

// ===== INTERACTION =====
client.on('interactionCreate', async interaction => {

const user = interaction.user.id;
safe(user);

if(interaction.isChatInputCommand()){

if(interaction.commandName==="money")
return interaction.reply(`💰 ${money[user]}`);

if(interaction.commandName==="daily"){
let gain = vip[user]?400:200;
money[user]+=gain; save();
return interaction.reply(`🎁 +${gain}`);
}

if(interaction.commandName==="bank"){
const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("dep").setLabel("Déposer").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("with").setLabel("Retirer").setStyle(ButtonStyle.Danger)
);
return interaction.reply({content:"🏦 Banque",components:[row]});
}

if(interaction.commandName==="pay"){
let t=interaction.options.getUser('user');
let a=interaction.options.getInteger('montant');
if(money[user]<a) return interaction.reply("❌");
money[user]-=a;
money[t.id]=(money[t.id]||0)+a;
save();
return interaction.reply("💸 envoyé");
}

if(["addmoney","removemoney"].includes(interaction.commandName)){
if(!isStaff(interaction.member)) return interaction.reply("❌");
let t=interaction.options.getUser('user');
let a=interaction.options.getInteger('montant');
if(interaction.commandName==="addmoney") money[t.id]+=a;
if(interaction.commandName==="removemoney") money[t.id]-=a;
save();
return interaction.reply("OK");
}

if(interaction.commandName==="appeladmin"){
client.channels.cache.get(LOG_CHANNEL_ID)?.send(
`🚨 ${interaction.user.username}\n${interaction.options.getString('msg')}`
);
return interaction.reply({content:"envoyé",ephemeral:true});
}

// LINK
if(interaction.commandName==="link"){
let code=Math.random().toString(36).substring(2,8).toUpperCase();
linkCodes[code]={user,created:Date.now()};
save();
return interaction.reply({content:`Code: ${code}`,ephemeral:true});
}

if(interaction.commandName==="validatelink"){
let code=interaction.options.getString('code');
let pseudo=interaction.options.getString('pseudo');
let u=interaction.options.getUser('user');

if(!linkCodes[code]) return interaction.reply("❌");

link[u.id]=pseudo;
delete linkCodes[code];
save();

return interaction.reply("✅ lié");
}

}

if(interaction.isButton()){
if(interaction.customId==="dep"){
money[user]-=100; bank[user]+=100; save();
return interaction.reply({content:"💰 déposé",ephemeral:true});
}
if(interaction.customId==="with"){
bank[user]-=100; money[user]+=100; save();
return interaction.reply({content:"💸 retiré",ephemeral:true});
}
}

});

// REGISTER
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('clientReady',async()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id,GUILD_ID),
{body:commands.map(c=>c.toJSON())}
);
console.log("BOT READY");
});

client.login(process.env.TOKEN);
