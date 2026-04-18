const fs = require('fs');
const {
  Client, GatewayIntentBits,
  SlashCommandBuilder, REST, Routes,
  PermissionFlagsBits
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== CONFIG =====
const GUILD_ID = "1480204997613457541";
const VIP_ROLE_ID = "1494408592441475234";

// ===== DATA =====
let money = {};
let rep = {};
let kills = {};
let mailbox = {};
let vip = {};

try { money = JSON.parse(fs.readFileSync('money.json')); } catch {}
try { rep = JSON.parse(fs.readFileSync('rep.json')); } catch {}
try { kills = JSON.parse(fs.readFileSync('kills.json')); } catch {}
try { mailbox = JSON.parse(fs.readFileSync('mailbox.json')); } catch {}
try { vip = JSON.parse(fs.readFileSync('vip.json')); } catch {}

function saveAll(){
  fs.writeFileSync('money.json', JSON.stringify(money,null,2));
  fs.writeFileSync('rep.json', JSON.stringify(rep,null,2));
  fs.writeFileSync('kills.json', JSON.stringify(kills,null,2));
  fs.writeFileSync('mailbox.json', JSON.stringify(mailbox,null,2));
  fs.writeFileSync('vip.json', JSON.stringify(vip,null,2));
}

function safe(u){
  if(!money[u]) money[u]=0;
  if(!rep[u]) rep[u]=0;
  if(!kills[u]) kills[u]=0;
  if(!mailbox[u]) mailbox[u]=[];
}

// ===== COMMANDES =====
const commands = [

new SlashCommandBuilder()
.setName('money')
.setDescription('Voir ton argent'),

new SlashCommandBuilder()
.setName('rep')
.setDescription('Voir ta réputation'),

new SlashCommandBuilder()
.setName('kills')
.setDescription('Voir tes kills'),

new SlashCommandBuilder()
.setName('leaderboard')
.setDescription('Top argent'),

new SlashCommandBuilder()
.setName('mail')
.setDescription('Voir ta boîte de messages'),

new SlashCommandBuilder()
.setName('sendmail')
.setDescription('Envoyer un message')
.addUserOption(o=>o.setName('user').setDescription('Utilisateur cible').setRequired(true))
.addStringOption(o=>o.setName('msg').setDescription('Message à envoyer').setRequired(true)),

new SlashCommandBuilder()
.setName('addmoney')
.setDescription('Ajouter de l’argent')
.addUserOption(o=>o.setName('user').setDescription('Utilisateur cible').setRequired(true))
.addIntegerOption(o=>o.setName('amount').setDescription('Montant').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

new SlashCommandBuilder()
.setName('vip')
.setDescription('Donner le VIP')
.addUserOption(o=>o.setName('user').setDescription('Utilisateur cible').setRequired(true))
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

];

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction=>{
if(!interaction.isChatInputCommand()) return;

const user = interaction.user.id;
safe(user);

// MONEY
if(interaction.commandName==="money"){
return interaction.reply(`💰 ${money[user]}`);
}

// REP
if(interaction.commandName==="rep"){
return interaction.reply(`⭐ ${rep[user]}`);
}

// KILLS
if(interaction.commandName==="kills"){
return interaction.reply(`⚔️ ${kills[user]}`);
}

// LEADERBOARD
if(interaction.commandName==="leaderboard"){
const sorted = Object.entries(money)
.sort((a,b)=>b[1]-a[1])
.slice(0,10);

let msg="🏆 Top Argent\n";

sorted.forEach((u,i)=>{
msg+=`${i+1}. <@${u[0]}> - ${u[1]}\n`;
});

return interaction.reply(msg);
}

// MAILBOX
if(interaction.commandName==="mail"){
if(mailbox[user].length===0)
return interaction.reply("📭 Boîte vide");

return interaction.reply(mailbox[user].join("\n"));
}

// SEND MAIL
if(interaction.commandName==="sendmail"){
const target = interaction.options.getUser('user').id;
const msg = interaction.options.getString('msg');

if(!mailbox[target]) mailbox[target]=[];

mailbox[target].push(`📩 ${interaction.user.username}: ${msg}`);
saveAll();

return interaction.reply("✅ Message envoyé");
}

// ADD MONEY
if(interaction.commandName==="addmoney"){
const target = interaction.options.getUser('user').id;
let amount = interaction.options.getInteger('amount');

safe(target);

// BONUS VIP x2
if(vip[target]) amount *= 2;

money[target] += amount;

saveAll();

return interaction.reply(`💰 ${amount} ajouté`);
}

// VIP
if(interaction.commandName==="vip"){
const target = interaction.options.getUser('user');

vip[target.id]=true;

const member = await interaction.guild.members.fetch(target.id);
await member.roles.add(VIP_ROLE_ID);

saveAll();

return interaction.reply("👑 VIP attribué");
}

});

// ===== REGISTER COMMANDS =====
const rest = new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('clientReady', async ()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id,GUILD_ID),
{body:commands}
);
console.log("✅ BOT PRÊT");
});

client.login(process.env.TOKEN);
