const fs = require('fs');
const {
Client, GatewayIntentBits,
SlashCommandBuilder, REST, Routes,
ActionRowBuilder, ButtonBuilder, ButtonStyle,
EmbedBuilder
} = require('discord.js');

const client = new Client({ intents:[GatewayIntentBits.Guilds] });

// ===== CONFIG =====
const GUILD_ID = "1480204997613457541";
const LOG_CHANNEL_ID = "1494371990113353978";
const ADMIN_ROLE_ID = "1480214844677554176";
const MOD_ROLE_ID = "1482081844466946160";
const VIP_ROLE_ID = "1494408592441475234";

// ===== LOAD =====
function load(f){ try{return JSON.parse(fs.readFileSync(f));}catch{return {}} }

let money=load('money.json');
let bank=load('bank.json');
let shop=load('shop.json');
let vip=load('vip.json');
let mailbox=load('mailbox.json');
let teams=load('teams.json');
let wars=load('wars.json');
let link=load('link.json');
let linkCodes=load('linkcodes.json');
let inventory=load('inventory.json');
let carts={};

// ===== SAVE =====
function save(){
fs.writeFileSync('money.json',JSON.stringify(money,null,2));
fs.writeFileSync('bank.json',JSON.stringify(bank,null,2));
fs.writeFileSync('shop.json',JSON.stringify(shop,null,2));
fs.writeFileSync('vip.json',JSON.stringify(vip,null,2));
fs.writeFileSync('mailbox.json',JSON.stringify(mailbox,null,2));
fs.writeFileSync('teams.json',JSON.stringify(teams,null,2));
fs.writeFileSync('wars.json',JSON.stringify(wars,null,2));
fs.writeFileSync('link.json',JSON.stringify(link,null,2));
fs.writeFileSync('linkcodes.json',JSON.stringify(linkCodes,null,2));
fs.writeFileSync('inventory.json',JSON.stringify(inventory,null,2));
}

function safe(u){
if(!money[u]) money[u]=0;
if(!bank[u]) bank[u]=0;
if(!mailbox[u]) mailbox[u]=[];
if(!inventory[u]) inventory[u]={};
}

// ===== PERMS =====
function isStaff(m){
return m.roles.cache.has(ADMIN_ROLE_ID) || m.roles.cache.has(MOD_ROLE_ID);
}

// ===== COMMANDES =====
const commands = [

new SlashCommandBuilder().setName('money').setDescription('Voir argent'),
new SlashCommandBuilder().setName('daily').setDescription('Récompense'),
new SlashCommandBuilder().setName('bank').setDescription('Voir banque'),

new SlashCommandBuilder().setName('pay').setDescription('Envoyer argent')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('addmoney').setDescription('Admin add')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('removemoney').setDescription('Admin remove')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('vip').setDescription('Donner VIP')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),

new SlashCommandBuilder().setName('shop').setDescription('Shop'),
new SlashCommandBuilder().setName('additem').setDescription('Ajouter item')
.addStringOption(o=>o.setName('categorie').setDescription('Cat').setRequired(true))
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true)),

new SlashCommandBuilder().setName('inventaire').setDescription('Inventaire'),
new SlashCommandBuilder().setName('useitem').setDescription('Utiliser item')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)),

new SlashCommandBuilder().setName('mail').setDescription('Voir mail'),
new SlashCommandBuilder().setName('sendmail').setDescription('Envoyer mail')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addStringOption(o=>o.setName('msg').setDescription('Msg').setRequired(true)),

new SlashCommandBuilder().setName('createteam').setDescription('Créer team')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)),

new SlashCommandBuilder().setName('teaminfo').setDescription('Infos team'),
new SlashCommandBuilder().setName('deleteteam').setDescription('Supprimer team'),

new SlashCommandBuilder().setName('guerre').setDescription('Déclarer guerre')
.addStringOption(o=>o.setName('team').setDescription('Nom').setRequired(true)),

new SlashCommandBuilder().setName('acceptguerre').setDescription('Accepter guerre'),
new SlashCommandBuilder().setName('leaderboard').setDescription('Top argent'),
new SlashCommandBuilder().setName('leaderboardguerre').setDescription('Top guerre'),

new SlashCommandBuilder().setName('link').setDescription('Code link'),
new SlashCommandBuilder().setName('validatelink').setDescription('Valider link')
.addStringOption(o=>o.setName('code').setDescription('Code').setRequired(true))
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),

];

// ===== INTERACTION =====
client.on('interactionCreate',async interaction=>{

const user=interaction.user.id;
safe(user);

// ===== COMMAND =====
if(interaction.isChatInputCommand()){

if(interaction.commandName==="money")
return interaction.reply(`💰 ${money[user]}`);

if(interaction.commandName==="daily"){
let gain=vip[user]?400:200;
money[user]+=gain; save();
return interaction.reply(`+${gain}`);
}

if(interaction.commandName==="bank")
return interaction.reply(`🏦 ${bank[user]}`);

if(interaction.commandName==="pay"){
let t=interaction.options.getUser('user');
let a=interaction.options.getInteger('montant');
if(money[user]<a) return interaction.reply("❌");
money[user]-=a;
money[t.id]=(money[t.id]||0)+a;
save();
return interaction.reply("envoyé");
}

// ADMIN
if(interaction.commandName==="addmoney"){
if(!isStaff(interaction.member)) return interaction.reply("❌");
let t=interaction.options.getUser('user');
money[t.id]+=interaction.options.getInteger('montant');
save();
return interaction.reply("OK");
}

if(interaction.commandName==="removemoney"){
if(!isStaff(interaction.member)) return interaction.reply("❌");
let t=interaction.options.getUser('user');
money[t.id]-=interaction.options.getInteger('montant');
save();
return interaction.reply("OK");
}

if(interaction.commandName==="vip"){
if(!isStaff(interaction.member)) return interaction.reply("❌");
let u=interaction.options.getUser('user');
vip[u.id]=true;
let m=await interaction.guild.members.fetch(u.id);
await m.roles.add(VIP_ROLE_ID);
save();
return interaction.reply("VIP OK");
}

// SHOP ADD
if(interaction.commandName==="additem"){
let c=interaction.options.getString('categorie');
let n=interaction.options.getString('nom');
let p=interaction.options.getInteger('prix');

if(!shop[c]) shop[c]={};

shop[c][n]={price:p,stock:999};

save();
return interaction.reply("item ajouté");
}

// INVENTAIRE
if(interaction.commandName==="inventaire"){
let inv=inventory[user];
if(!inv || Object.keys(inv).length===0)
return interaction.reply("vide");

let txt=Object.entries(inv).map(([n,q])=>`${n} x${q}`).join("\n");
return interaction.reply(txt);
}

if(interaction.commandName==="useitem"){
let n=interaction.options.getString('nom');

if(!inventory[user][n]) return interaction.reply("❌");

inventory[user][n]--;
if(inventory[user][n]<=0) delete inventory[user][n];

save();
return interaction.reply("utilisé");
}

// MAIL
if(interaction.commandName==="mail")
return interaction.reply({content:(mailbox[user]||[]).join("\n")||"vide",ephemeral:true});

if(interaction.commandName==="sendmail"){
let t=interaction.options.getUser('user').id;
if(!mailbox[t]) mailbox[t]=[];
mailbox[t].push(interaction.options.getString('msg'));
save();
return interaction.reply("envoyé");
}

// TEAM
if(interaction.commandName==="createteam"){
teams[user]={nom:interaction.options.getString('nom'),chef:user,membres:[user]};
save();
return interaction.reply("créée");
}

if(interaction.commandName==="teaminfo"){
let t=teams[user];
if(!t) return interaction.reply("❌");
return interaction.reply(`${t.nom} | membres:${t.membres.length}`);
}

if(interaction.commandName==="deleteteam"){
delete teams[user]; save();
return interaction.reply("supprimée");
}

// GUERRE
if(interaction.commandName==="guerre"){
let name=interaction.options.getString('team');
wars[user]={vs:name,points:0};
save();
return interaction.reply("déclarée");
}

if(interaction.commandName==="acceptguerre")
return interaction.reply("acceptée");

// LEADERBOARD
if(interaction.commandName==="leaderboard"){
let top=Object.entries(money).sort((a,b)=>b[1]-a[1]).slice(0,10)
.map(([id,v],i)=>`${i+1}. <@${id}> ${v}`).join("\n");
return interaction.reply(top||"vide");
}

if(interaction.commandName==="leaderboardguerre")
return interaction.reply("aucune");

// LINK
if(interaction.commandName==="link"){
let code=Math.random().toString(36).substring(2,8);
linkCodes[code]={user:user};
save();
return interaction.reply({content:`code: ${code}`,ephemeral:true});
}

if(interaction.commandName==="validatelink"){
if(!isStaff(interaction.member)) return interaction.reply("❌");
let code=interaction.options.getString('code');
let u=interaction.options.getUser('user');
if(!linkCodes[code]) return interaction.reply("❌");
link[u.id]=true;
delete linkCodes[code];
save();
return interaction.reply("validé");
}

}

});

// ===== REGISTER =====
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('ready',async()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id,GUILD_ID),
{body:commands.map(c=>c.toJSON())}
);
console.log("READY");
});

client.login(process.env.TOKEN);
