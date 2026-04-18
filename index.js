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
.setName('createteam')
.setDescription('Créer une team')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addStringOption(o=>o.setName('objectif').setDescription('Objectif').setRequired(true))
.addStringOption(o=>o.setName('base').setDescription('Coordonnées')),

new SlashCommandBuilder().setName('teaminfo').setDescription('Voir infos team'),
new SlashCommandBuilder().setName('deleteteam').setDescription('Supprimer team'),

new SlashCommandBuilder()
.setName('guerre')
.setDescription('Déclarer guerre')
.addStringOption(o=>o.setName('team').setDescription('Nom team').setRequired(true)),

new SlashCommandBuilder().setName('acceptguerre').setDescription('Accepter guerre'),
new SlashCommandBuilder().setName('leaderboardguerre').setDescription('Top guerres'),

new SlashCommandBuilder()
.setName('sendmail')
.setDescription('Envoyer mail')
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true))
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder().setName('mail').setDescription('Voir tes mails'),
new SlashCommandBuilder().setName('leaderboard').setDescription('Classement argent'),

new SlashCommandBuilder()
.setName('link')
.setDescription('Obtenir un code de liaison'),

new SlashCommandBuilder()
.setName('validatelink')
.setDescription('Valider un joueur')
.addStringOption(o=>o.setName('code').setDescription('Code').setRequired(true))
.addStringOption(o=>o.setName('pseudo').setDescription('Pseudo MC').setRequired(true))
.addUserOption(o=>o.setName('user').setDescription('Joueur').setRequired(true)),
}

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {

const user = interaction.user.id;
safe(user);

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

if(interaction.commandName==="shop"){
if(!shop || Object.keys(shop).length===0)
return interaction.reply("❌ Shop vide");

const row=new ActionRowBuilder();
for(let cat in shop){
row.addComponents(
new ButtonBuilder().setCustomId(`cat_${cat}`).setLabel(cat).setStyle(ButtonStyle.Secondary)
);
}
return interaction.reply({content:"📦 Catégories",components:[row]});
}

if(interaction.commandName==="additem"){
const c=interaction.options.getString('categorie');
const n=interaction.options.getString('nom');
const p=interaction.options.getInteger('prix');
if(p<=0) return interaction.reply("❌ prix invalide");
if(!shop[c]) shop[c]={};
shop[c][n]=p;
save();
return interaction.reply("✅ ajouté");
}

if(interaction.commandName==="vip"){
const u=interaction.options.getUser('user');
vip[u.id]=true;
const m=await interaction.guild.members.fetch(u.id);
await m.roles.add(VIP_ROLE_ID);
save();
return interaction.reply("VIP OK");
}

if(interaction.commandName==="createteam"){
teams[user]={
nom:interaction.options.getString('nom'),
chef:user,
objectif:interaction.options.getString('objectif'),
base:interaction.options.getString('base')||"non défini",
membres:[user]
};
save();
return interaction.reply("team créée");
}

if(interaction.commandName==="teaminfo"){
const t=teams[user];
if(!t) return interaction.reply("❌");
return interaction.reply(`🛡️ ${t.nom}\n👑 <@${t.chef}>\n👥 ${t.membres.length}\n🎯 ${t.objectif}\n📍 ${t.base}`);
}

if(interaction.commandName==="deleteteam"){
delete teams[user]; save();
return interaction.reply("team supprimée");
}

if(interaction.commandName==="guerre"){
const targetName=interaction.options.getString('team');
const myTeam=teams[user];
const targetTeam=Object.values(teams).find(t=>t.nom===targetName);
if(!myTeam||!targetTeam) return interaction.reply("❌");
wars[myTeam.nom+"_"+targetTeam.nom]={attacker:myTeam.nom,defender:targetTeam.nom,accepted:false};
save();
return interaction.reply("⚔️ demande envoyée");
}

if(interaction.commandName==="acceptguerre"){
const myTeam=teams[user];
const war=Object.values(wars).find(w=>w.defender===myTeam.nom&&!w.accepted);
if(!war) return interaction.reply("❌");
war.accepted=true;
war.points={[war.attacker]:0,[war.defender]:0};
save();
return interaction.reply("🔥 guerre lancée");
}

if(interaction.commandName==="leaderboardguerre"){
const txt=Object.values(wars)
.filter(w=>w.accepted)
.map(w=>`${w.attacker} ${w.points[w.attacker]} vs ${w.defender} ${w.points[w.defender]}`)
.join("\n");
return interaction.reply(txt||"aucune");
}

if(interaction.commandName==="sendmail"){
const t=interaction.options.getUser('user').id;
if(!mailbox[t]) mailbox[t]=[];
mailbox[t].push(interaction.options.getString('msg'));
save();
return interaction.reply("envoyé");
}

if(interaction.commandName==="mail"){
return interaction.reply({
content:(mailbox[user]||[]).join("\n")||"vide",
ephemeral:true
});
}

if(interaction.commandName==="leaderboard"){
const top=Object.entries(money)
.sort((a,b)=>b[1]-a[1])
.slice(0,10)
.map(([id,v],i)=>`${i+1}. <@${id}> - ${v}`)
.join("\n");

return interaction.reply(top||"vide");
}

if(interaction.commandName==="link"){

const code = Math.random().toString(36).substring(2,8).toUpperCase();

linkCodes[code] = {
user: interaction.user.id,
created: Date.now()
};

save();

return interaction.reply({
content:`🔑 Ton code : **${code}**

📩 Envoie dans ton ticket :
Pseudo MC : TON_PSEUDO
Code : ${code}`,
ephemeral:true
});
if(interaction.commandName==="validatelink"){

if(!isStaff(interaction.member))
return interaction.reply("❌ Pas la permission");

const code = interaction.options.getString('code');
const pseudo = interaction.options.getString('pseudo');
const userTarget = interaction.options.getUser('user');

// Vérif code
if(!linkCodes[code])
return interaction.reply("❌ Code invalide");

// Expiration 5 min
if(Date.now() - linkCodes[code].created > 300000){
delete linkCodes[code];
save();
return interaction.reply("❌ Code expiré");
}

// LINK
link[userTarget.id] = pseudo;

// supprimer code
delete linkCodes[code];

save();

// 🎯 AJOUT ROLE (MODIFIE L'ID)
const ROLE_ID = "ID_ROLE_ACCES";

try{
const member = await interaction.guild.members.fetch(userTarget.id);
await member.roles.add(ROLE_ID);
}catch(e){}

// LOG
log("🔗 Link",`${pseudo} → ${userTarget.username}`);

return interaction.reply(`✅ ${pseudo} lié à ${userTarget.username}`);
}

}

// ===== BUTTONS =====
if(interaction.isButton()){

if(interaction.customId.startsWith("cat_")){
const cat=interaction.customId.replace("cat_","");
return interaction.update(shopPage(cat,0));
}

if(interaction.customId.startsWith("next_")){
const [_,cat,page]=interaction.customId.split("_");
return interaction.update(shopPage(cat,parseInt(page)+1));
}

if(interaction.customId.startsWith("prev_")){
const [_,cat,page]=interaction.customId.split("_");
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
const [_,cat,name]=interaction.customId.split("_");
const price=shop[cat][name];

const row=new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId(`confirm_${cat}_${name}`).setLabel("✅").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("cancel").setLabel("❌").setStyle(ButtonStyle.Danger)
);

return interaction.reply({
content:`Acheter ${name} (${price}) ?`,
components:[row],
ephemeral:true
});
}

if(interaction.customId.startsWith("confirm_")){
const [_,cat,name]=interaction.customId.split("_");
const price=shop[cat][name];
if(money[user]<price)
return interaction.update({content:"❌",components:[]});

money[user]-=price;
save();

return interaction.update({content:"✅ acheté",components:[]});
}

if(interaction.customId==="cancel"){
return interaction.update({content:"❌ annulé",components:[]});
}

if(interaction.customId==="generate_code"){

const code = Math.random().toString(36).substring(2,8).toUpperCase();

linkCodes[code] = {
user: interaction.user.id,
created: Date.now()
};

save();

return interaction.reply({
content:`🔑 Code : **${code}**\n\nEn jeu : /setlink ${code}`,
ephemeral:true
});
}

// ===== REGISTER =====
const rest=new REST({version:'10'}).setToken(process.env.TOKEN);

client.once('clientReady',async()=>{
await rest.put(
Routes.applicationGuildCommands(client.user.id,GUILD_ID),
{body:commands.map(c=>c.toJSON())}
);
console.log("BOT READY");
});

const express = require('express');
const app = express();

app.use(express.json());

const SECRET = "dragon_secure_key"; // change ça

app.post('/link', (req, res) => {

if(req.headers.authorization !== SECRET){
return res.status(403).json({ error:"forbidden" });
}

const { code, pseudo } = req.body;

// Vérif code
if(!linkCodes[code]){
return res.json({ success:false, msg:"code invalide" });
}

// Expiration (5 min)
if(Date.now() - linkCodes[code].created > 300000){
delete linkCodes[code];
save();
return res.json({ success:false, msg:"code expiré" });
}

// LINK
const userId = linkCodes[code].user;

link[userId] = pseudo;

// supprimer code
delete linkCodes[code];

save();

console.log(`✅ LINK : ${pseudo} → ${userId}`);

res.json({ success:true });

});

app.listen(3000, () => console.log("🌐 API ON"));

  client.login(process.env.TOKEN);
