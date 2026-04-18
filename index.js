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

let money=load('money.json');
let shop=load('shop.json');
let vip=load('vip.json');
let teams=load('teams.json');
let mailbox=load('mailbox.json');
let wars=load('wars.json');

// ===== SAVE =====
function save(){
fs.writeFileSync('money.json',JSON.stringify(money,null,2));
fs.writeFileSync('shop.json',JSON.stringify(shop,null,2));
fs.writeFileSync('vip.json',JSON.stringify(vip,null,2));
fs.writeFileSync('teams.json',JSON.stringify(teams,null,2));
fs.writeFileSync('mailbox.json',JSON.stringify(mailbox,null,2));
fs.writeFileSync('wars.json',JSON.stringify(wars,null,2));
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
const ch=client.channels.cache.get(LOG_CHANNEL_ID);
if(!ch) return;
ch.send({embeds:[new EmbedBuilder().setTitle(title).setDescription(desc)]});
}

// ===== SHOP PAGE =====
function shopPage(cat,page){
const items = Object.entries(shop[cat]);
const perPage = 5;
const start = page*perPage;
const current = items.slice(start,start+perPage);

const row = new ActionRowBuilder();
const nav = new ActionRowBuilder();

current.forEach(([name,price])=>{
row.addComponents(
new ButtonBuilder().setCustomId(`buy_${cat}_${name}`).setLabel(`${name} (${price})`).setStyle(ButtonStyle.Primary)
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

new SlashCommandBuilder()
.setName('money')
.setDescription('Voir ton argent'),

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

new SlashCommandBuilder()
.setName('shop')
.setDescription('Ouvrir le shop'),

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
.setName('createteam')
.setDescription('Créer une team')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addStringOption(o=>o.setName('objectif').setDescription('Objectif').setRequired(true))
.addStringOption(o=>o.setName('base').setDescription('Coordonnées')),

new SlashCommandBuilder()
.setName('teaminfo')
.setDescription('Voir infos team'),

new SlashCommandBuilder()
.setName('deleteteam')
.setDescription('Supprimer team'),

new SlashCommandBuilder()
.setName('guerre')
.setDescription('Déclarer guerre')
.addStringOption(o=>o.setName('team').setDescription('Nom team').setRequired(true)),

new SlashCommandBuilder()
.setName('acceptguerre')
.setDescription('Accepter guerre'),

new SlashCommandBuilder()
.setName('leaderboardguerre')
.setDescription('Top guerres'),

new SlashCommandBuilder()
.setName('sendmail')
.setDescription('Envoyer mail')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder()
.setName('mail')
.setDescription('Voir tes mails'),

new SlashCommandBuilder()
.setName('leaderboard')
.setDescription('Classement argent'),

];

// ECONOMIE
new SlashCommandBuilder().setName('money').setDescription('Voir argent'),

new SlashCommandBuilder().setName('pay')
.setDescription('Envoyer argent')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

// ADMIN
new SlashCommandBuilder().setName('addmoney')
.addUserOption(o=>o.setName('user').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setRequired(true)),

new SlashCommandBuilder().setName('removemoney')
.addUserOption(o=>o.setName('user').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setRequired(true)),

// SHOP
new SlashCommandBuilder().setName('shop').setDescription('Shop'),

new SlashCommandBuilder().setName('additem')
.addStringOption(o=>o.setName('categorie').setRequired(true))
.addStringOption(o=>o.setName('nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setRequired(true)),

// VIP
new SlashCommandBuilder().setName('vip')
.addUserOption(o=>o.setName('user').setRequired(true)),

// TEAM
new SlashCommandBuilder().setName('createteam')
.addStringOption(o=>o.setName('nom').setRequired(true))
.addStringOption(o=>o.setName('objectif').setRequired(true))
.addStringOption(o=>o.setName('base')),

new SlashCommandBuilder().setName('teaminfo'),
new SlashCommandBuilder().setName('deleteteam'),

// GUERRE
new SlashCommandBuilder().setName('guerre')
.addStringOption(o=>o.setName('team').setRequired(true)),

new SlashCommandBuilder().setName('acceptguerre'),
new SlashCommandBuilder().setName('leaderboardguerre'),

// MAIL
new SlashCommandBuilder().setName('sendmail')
.addUserOption(o=>o.setName('user').setRequired(true))
.addStringOption(o=>o.setName('msg').setRequired(true)),

new SlashCommandBuilder().setName('mail'),

new SlashCommandBuilder().setName('leaderboard')
];

// ===== INTERACTION =====
client.on('interactionCreate',async interaction=>{

const user=interaction.user.id;
safe(user);

// ===== COMMANDES =====
if(interaction.isChatInputCommand()){

// MONEY
if(interaction.commandName==="money")
return interaction.reply(`💰 ${money[user]}`);

// PAY
if(interaction.commandName==="pay"){
let t=interaction.options.getUser('user');
let a=interaction.options.getInteger('montant');
if(money[user]<a) return interaction.reply("❌");
money[user]-=a;
money[t.id]=(money[t.id]||0)+a;
save();
return interaction.reply("💸 envoyé");
}

// ADMIN
if(["addmoney","removemoney"].includes(interaction.commandName)){
if(!isStaff(interaction.member)) return interaction.reply("❌");
let t=interaction.options.getUser('user');
let a=interaction.options.getInteger('montant');
if(interaction.commandName==="addmoney") money[t.id]=(money[t.id]||0)+a;
if(interaction.commandName==="removemoney") money[t.id]-=a;
save();
return interaction.reply("OK");
}

// SHOP
if(interaction.commandName==="shop"){
const row=new ActionRowBuilder();
for(let cat in shop){
row.addComponents(new ButtonBuilder().setCustomId(`cat_${cat}`).setLabel(cat).setStyle(ButtonStyle.Secondary));
}
return interaction.reply({content:"📦 Catégories",components:[row]});
}

// ADDITEM
if(interaction.commandName==="additem"){
let c=interaction.options.getString('categorie');
let n=interaction.options.getString('nom');
let p=interaction.options.getInteger('prix');
if(!shop[c]) shop[c]={};
shop[c][n]=p;
save();
return interaction.reply("✅ ajouté");
}

// VIP
if(interaction.commandName==="vip"){
let u=interaction.options.getUser('user');
vip[u.id]=true;
let m=await interaction.guild.members.fetch(u.id);
await m.roles.add(VIP_ROLE_ID);
save();
return interaction.reply("VIP OK");
}

// TEAM
if(interaction.commandName==="createteam"){
teams[user]={nom:interaction.options.getString('nom'),chef:user,objectif:interaction.options.getString('objectif'),base:interaction.options.getString('base')||"none",membres:[user]};
save();
return interaction.reply("team créée");
}

if(interaction.commandName==="teaminfo"){
let t=teams[user];
if(!t) return interaction.reply("❌");
return interaction.reply(`🛡️ ${t.nom}\n👑 <@${t.chef}>\n👥 ${t.membres.length}\n🎯 ${t.objectif}\n📍 ${t.base}`);
}

if(interaction.commandName==="deleteteam"){
delete teams[user]; save();
return interaction.reply("supprimée");
}

// GUERRE
if(interaction.commandName==="guerre"){
let targetName=interaction.options.getString('team');
let myTeam=teams[user];
let targetTeam=Object.values(teams).find(t=>t.nom===targetName);
if(!myTeam||!targetTeam) return interaction.reply("❌");
wars[myTeam.nom+"_"+targetTeam.nom]={attacker:myTeam.nom,defender:targetTeam.nom,accepted:false};
save();
return interaction.reply("⚔️ demande envoyée");
}

if(interaction.commandName==="acceptguerre"){
let myTeam=teams[user];
let war=Object.values(wars).find(w=>w.defender===myTeam.nom&&!w.accepted);
if(!war) return interaction.reply("❌");
war.accepted=true;
war.points={[war.attacker]:0,[war.defender]:0};
save();
return interaction.reply("🔥 guerre lancée");
}

if(interaction.commandName==="leaderboardguerre"){
let txt=Object.values(wars).filter(w=>w.accepted).map(w=>`${w.attacker} ${w.points[w.attacker]} vs ${w.defender} ${w.points[w.defender]}`).join("\n");
return interaction.reply(txt||"aucune");
}

// MAIL
if(interaction.commandName==="sendmail"){
let t=interaction.options.getUser('user').id;
if(!mailbox[t]) mailbox[t]=[];
mailbox[t].push(interaction.options.getString('msg'));
save();
return interaction.reply("envoyé");
}

if(interaction.commandName==="mail"){
return interaction.reply({content:(mailbox[user]||[]).join("\n")||"vide",ephemeral:true});
}

// LEADERBOARD
if(interaction.commandName==="leaderboard"){
let top=Object.entries(money).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([id,v],i)=>`${i+1}. <@${id}> - ${v}`).join("\n");
return interaction.reply(top||"vide");
}

}

// ===== BUTTONS =====
if(interaction.isButton()){

if(interaction.customId.startsWith("cat_")){
let cat=interaction.customId.replace("cat_","");
return interaction.update(shopPage(cat,0));
}

if(interaction.customId.startsWith("next_")){
let [_,cat,page]=interaction.customId.split("_");
return interaction.update(shopPage(cat,parseInt(page)+1));
}

if(interaction.customId.startsWith("prev_")){
let [_,cat,page]=interaction.customId.split("_");
return interaction.update(shopPage(cat,parseInt(page)-1));
}

if(interaction.customId==="back"){
const row=new ActionRowBuilder();
for(let cat in shop){
row.addComponents(new ButtonBuilder().setCustomId(`cat_${cat}`).setLabel(cat).setStyle(ButtonStyle.Secondary));
}
return interaction.update({content:"📦 Catégories",components:[row]});
}

if(interaction.customId.startsWith("buy_")){
let [_,cat,name]=interaction.customId.split("_");
let price=shop[cat][name];

const row=new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId(`confirm_${cat}_${name}`).setLabel("✅").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("cancel").setLabel("❌").setStyle(ButtonStyle.Danger)
);

return interaction.reply({content:`Acheter ${name} (${price}) ?`,components:[row],ephemeral:true});
}

if(interaction.customId.startsWith("confirm_")){
let [_,cat,name]=interaction.customId.split("_");
let price=shop[cat][name];
if(money[user]<price) return interaction.update({content:"❌",components:[]});
money[user]-=price;
save();
return interaction.update({content:"✅ acheté",components:[]});
}

if(interaction.customId==="cancel"){
return interaction.update({content:"❌ annulé",components:[]});
}

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
