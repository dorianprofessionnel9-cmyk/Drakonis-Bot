const fs = require('fs');
const {
  Client, GatewayIntentBits, EmbedBuilder,
  SlashCommandBuilder, REST, Routes,
  PermissionFlagsBits
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== CONFIG =====
const GUILD_ID = "TON_GUILD_ID";
const VIP_ROLE_ID = "TON_ROLE_VIP";
const ADMIN_CHANNEL_ID = "TON_SALON_ADMIN";
const ADMIN_ROLE_ID = "TON_ROLE_ADMIN";
const MOD_ROLE_ID = "TON_ROLE_MODO";

// ===== DATA =====
let money={}, rep={}, kills={}, shop={}, mailbox={}, vip={}, teams={}, wars={};

function load(file){ try{return JSON.parse(fs.readFileSync(file))}catch{return {}} }

money = load('money.json');
rep = load('rep.json');
kills = load('kills.json');
shop = load('shop.json');
mailbox = load('mailbox.json');
vip = load('vip.json');
teams = load('teams.json');
wars = load('wars.json');

function save(){
fs.writeFileSync('money.json', JSON.stringify(money,null,2));
fs.writeFileSync('rep.json', JSON.stringify(rep,null,2));
fs.writeFileSync('kills.json', JSON.stringify(kills,null,2));
fs.writeFileSync('shop.json', JSON.stringify(shop,null,2));
fs.writeFileSync('mailbox.json', JSON.stringify(mailbox,null,2));
fs.writeFileSync('vip.json', JSON.stringify(vip,null,2));
fs.writeFileSync('teams.json', JSON.stringify(teams,null,2));
fs.writeFileSync('wars.json', JSON.stringify(wars,null,2));
}

function safe(u){
if(!money[u]) money[u]=0;
if(!rep[u]) rep[u]=0;
if(!kills[u]) kills[u]=0;
if(!mailbox[u]) mailbox[u]=[];
}

// ===== COMMANDES =====
const commands = [

new SlashCommandBuilder().setName('money').setDescription('Voir argent'),
new SlashCommandBuilder().setName('rep').setDescription('Voir rep'),
new SlashCommandBuilder().setName('kills').setDescription('Voir kills'),

new SlashCommandBuilder().setName('daily').setDescription('Récompense quotidienne'),

new SlashCommandBuilder().setName('shop').setDescription('Voir shop'),

new SlashCommandBuilder().setName('additem')
.setDescription('Ajouter item')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

new SlashCommandBuilder().setName('leaderboard').setDescription('Top joueurs'),

new SlashCommandBuilder().setName('mail').setDescription('Voir messages'),

new SlashCommandBuilder().setName('sendmail')
.setDescription('Envoyer message')
.addUserOption(o=>o.setName('user').setDescription('Utilisateur').setRequired(true))
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder().setName('vip')
.setDescription('Donner VIP')
.addUserOption(o=>o.setName('user').setDescription('Utilisateur').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

new SlashCommandBuilder().setName('appeladmin')
.setDescription('Signaler problème')
.addStringOption(o=>o.setName('probleme').setDescription('Problème').setRequired(true)),

// TEAM
new SlashCommandBuilder().setName('createteam').setDescription('Créer team')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)),

new SlashCommandBuilder().setName('jointeam').setDescription('Rejoindre team')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)),

new SlashCommandBuilder().setName('leaveteam').setDescription('Quitter team'),
new SlashCommandBuilder().setName('teaminfo').setDescription('Voir team'),
new SlashCommandBuilder().setName('deleteteam').setDescription('Supprimer team'),

new SlashCommandBuilder().setName('teamleaderboard').setDescription('Top teams'),

new SlashCommandBuilder().setName('guerre')
.setDescription('Déclarer guerre')
.addStringOption(o=>o.setName('team').setDescription('Team cible').setRequired(true)),

new SlashCommandBuilder().setName('guerres').setDescription('Voir guerres')

];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction=>{
if(!interaction.isChatInputCommand()) return;

const user = interaction.user.id;
safe(user);

// ===== BASIC =====
if(interaction.commandName==="money") return interaction.reply(`💰 ${money[user]}`);
if(interaction.commandName==="rep") return interaction.reply(`⭐ ${rep[user]}`);
if(interaction.commandName==="kills") return interaction.reply(`⚔️ ${kills[user]}`);

// DAILY
if(interaction.commandName==="daily"){
money[user]+=200;
rep[user]+=5;
save();
return interaction.reply("🎁 +200");
}

// ===== SHOP =====
if(interaction.commandName==="shop"){
if(Object.keys(shop).length===0) return interaction.reply("❌ Vide");

let msg="🛒 Shop\n";
for(let i in shop) msg+=`• ${i} - ${shop[i]}💰\n`;

return interaction.reply(msg);
}

if(interaction.commandName==="additem"){
const n=interaction.options.getString('nom');
const p=interaction.options.getInteger('prix');
shop[n]=p;
save();
return interaction.reply("✅ ajouté");
}

// ===== LEADERBOARD =====
if(interaction.commandName==="leaderboard"){
let arr=Object.entries(money).sort((a,b)=>b[1]-a[1]).slice(0,10);
let msg="🏆 Top joueurs\n";
arr.forEach((u,i)=>msg+=`${i+1}. <@${u[0]}> - ${u[1]}\n`);
return interaction.reply(msg);
}

// ===== MAIL =====
if(interaction.commandName==="mail"){
if(mailbox[user].length===0) return interaction.reply("📭 Vide");
return interaction.reply(mailbox[user].join("\n"));
}

if(interaction.commandName==="sendmail"){
const t=interaction.options.getUser('user').id;
if(!mailbox[t]) mailbox[t]=[];
mailbox[t].push(`📩 ${interaction.user.username}: ${interaction.options.getString('msg')}`);
save();
return interaction.reply("✅ envoyé");
}

// ===== VIP =====
if(interaction.commandName==="vip"){
const t=interaction.options.getUser('user');
vip[t.id]=true;
const m=await interaction.guild.members.fetch(t.id);
m.roles.add(VIP_ROLE_ID);
save();
return interaction.reply("👑 VIP donné");
}

// ===== ADMIN CALL =====
if(interaction.commandName==="appeladmin"){
const ch=client.channels.cache.get(ADMIN_CHANNEL_ID);
ch.send(`<@&${ADMIN_ROLE_ID}> <@&${MOD_ROLE_ID}> 🚨 ${interaction.options.getString('probleme')}`);
return interaction.reply({content:"✅ envoyé",ephemeral:true});
}

// ===== TEAM =====
if(interaction.commandName==="createteam"){
const name=interaction.options.getString('nom');
teams[name]={chef:user,membres:[user]};
save();
return interaction.reply(`🛡️ ${name} créée`);
}

if(interaction.commandName==="jointeam"){
const name=interaction.options.getString('nom');
if(!teams[name]) return interaction.reply("❌ inexistante");
teams[name].membres.push(user);
save();
return interaction.reply("✅ rejoint");
}

if(interaction.commandName==="leaveteam"){
for(let t in teams){
teams[t].membres=teams[t].membres.filter(id=>id!==user);
}
save();
return interaction.reply("🚪 quitté");
}

if(interaction.commandName==="teaminfo"){
for(let t in teams){
if(teams[t].membres.includes(user))
return interaction.reply(`🛡️ ${t} | 👥 ${teams[t].membres.length}`);
}
return interaction.reply("❌ aucune team");
}

// ===== TEAM LEADERBOARD =====
if(interaction.commandName==="teamleaderboard"){
let list=[];
for(let t in teams){
let pts=0;
teams[t].membres.forEach(id=>{
pts+=(money[id]||0)+(kills[id]||0)*10+(rep[id]||0)*5;
});
list.push({t,pts});
}
list.sort((a,b)=>b.pts-a.pts);

let msg="🏆 Teams\n";
list.slice(0,10).forEach((e,i)=>msg+=`${i+1}. ${e.t} - ${e.pts}\n`);

return interaction.reply(msg);
}

// ===== GUERRE =====
if(interaction.commandName==="guerre"){
const team=interaction.options.getString('team');
wars[team]={demande:user};
save();
return interaction.reply(`⚔️ guerre contre ${team}`);
}

if(interaction.commandName==="guerres"){
let msg="⚔️ Guerres\n";
for(let w in wars) msg+=`• ${w}\n`;
return interaction.reply(msg);
}

});

// ===== REGISTER =====
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('clientReady', async ()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id,GUILD_ID),
{body:commands}
);
console.log("✅ BOT READY");
});

client.login(process.env.TOKEN);
