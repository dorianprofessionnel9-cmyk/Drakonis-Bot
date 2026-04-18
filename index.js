const fs = require('fs');
const {
  Client, GatewayIntentBits,
  SlashCommandBuilder, REST, Routes,
  PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== CONFIG =====
const GUILD_ID = "1480204997613457541";

const LOG_CHANNEL_ID = "1494371990113353978";
const ADMIN_CHANNEL_ID = "1495023085366022245";

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
let history=load('history.json');

// ===== SAVE =====
function save(){
fs.writeFileSync('money.json',JSON.stringify(money,null,2));
fs.writeFileSync('bank.json',JSON.stringify(bank,null,2));
fs.writeFileSync('shop.json',JSON.stringify(shop,null,2));
fs.writeFileSync('vip.json',JSON.stringify(vip,null,2));
fs.writeFileSync('mailbox.json',JSON.stringify(mailbox,null,2));
fs.writeFileSync('teams.json',JSON.stringify(teams,null,2));
fs.writeFileSync('wars.json',JSON.stringify(wars,null,2));
fs.writeFileSync('history.json',JSON.stringify(history,null,2));
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
const ch=client.channels.cache.get(LOG_CHANNEL_ID);
if(!ch) return;
ch.send({embeds:[new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0x00ffcc).setTimestamp()]});
}

// ===== COMMANDES =====
const commands=[

new SlashCommandBuilder().setName('money').setDescription('Voir argent'),
new SlashCommandBuilder().setName('daily').setDescription('Daily'),
new SlashCommandBuilder().setName('deposit').setDescription('Déposer').addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),
new SlashCommandBuilder().setName('withdraw').setDescription('Retirer').addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),
new SlashCommandBuilder().setName('bank').setDescription('Ouvrir banque'),

new SlashCommandBuilder().setName('pay').setDescription('Envoyer argent')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('shop').setDescription('Shop'),
new SlashCommandBuilder().setName('additem').setDescription('Add item')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true))
.addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true)),

new SlashCommandBuilder().setName('addmoney').setDescription('Admin add')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('removemoney').setDescription('Admin remove')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('setmoney').setDescription('Admin set')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true)),

new SlashCommandBuilder().setName('resetmoney').setDescription('Admin reset')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),

new SlashCommandBuilder().setName('appeladmin').setDescription('Problème')
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder().setName('vip').setDescription('Donner VIP')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),

new SlashCommandBuilder().setName('mail').setDescription('Voir mail'),
new SlashCommandBuilder().setName('sendmail').setDescription('Envoyer mail')
.addUserOption(o=>o.setName('user').setDescription('User').setRequired(true))
.addStringOption(o=>o.setName('msg').setDescription('Message').setRequired(true)),

new SlashCommandBuilder().setName('createteam').setDescription('Créer')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)),
new SlashCommandBuilder().setName('jointeam').setDescription('Join')
.addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)),
new SlashCommandBuilder().setName('teaminfo').setDescription('Info'),
new SlashCommandBuilder().setName('deleteteam').setDescription('Delete'),

];

// ===== INTERACTION =====
client.on('interactionCreate',async interaction=>{

const user=interaction.user.id;
safe(user);

// ===== MODALS =====
if(interaction.isModalSubmit()){
const amount = parseInt(interaction.fields.getTextInputValue("amount"));

if(isNaN(amount) || amount <= 0)
return interaction.reply({content:"❌ Montant invalide",ephemeral:true});

if(interaction.customId==="deposit_modal"){
if(money[user] < amount) return interaction.reply({content:"❌ Pas assez",ephemeral:true});
money[user]-=amount; bank[user]+=amount; save();
return interaction.reply({content:`🏦 Déposé ${amount}`,ephemeral:true});
}

if(interaction.customId==="withdraw_modal"){
if(bank[user] < amount) return interaction.reply({content:"❌ Pas assez",ephemeral:true});
bank[user]-=amount; money[user]+=amount; save();
return interaction.reply({content:`💸 Retiré ${amount}`,ephemeral:true});
}
}

// ===== COMMANDES =====
if(interaction.isChatInputCommand()){

if(interaction.commandName==="money") return interaction.reply(`💰 ${money[user]}`);

if(interaction.commandName==="bank"){
const row=new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("bank_deposit").setLabel("➕ Déposer").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("bank_withdraw").setLabel("➖ Retirer").setStyle(ButtonStyle.Danger)
);
return interaction.reply({content:`🏦 ${money[user]} | ${bank[user]}`,components:[row],ephemeral:true});
}

if(interaction.commandName==="withdraw"){
let a=interaction.options.getInteger('montant');
if(a<=0 || bank[user]<a) return interaction.reply("❌");
bank[user]-=a; money[user]+=a; save();
return interaction.reply("💸 OK");
}

if(interaction.commandName==="shop"){
const row=new ActionRowBuilder();
let i=0;
for(let item in shop){
row.addComponents(new ButtonBuilder().setCustomId(`buy_${item}`).setLabel(`${item} (${shop[item]})`).setStyle(ButtonStyle.Primary));
i++; if(i===5) break;
}
return interaction.reply({content:"🛒 Shop",components:[row]});
}
}

// ===== BUTTONS =====
if(interaction.isButton()){

if(interaction.customId==="bank_deposit"){
const modal=new ModalBuilder().setCustomId("deposit_modal").setTitle("Déposer");
const input=new TextInputBuilder().setCustomId("amount").setLabel("Montant").setStyle(TextInputStyle.Short);
modal.addComponents(new ActionRowBuilder().addComponents(input));
return interaction.showModal(modal);
}

if(interaction.customId==="bank_withdraw"){
const modal=new ModalBuilder().setCustomId("withdraw_modal").setTitle("Retirer");
const input=new TextInputBuilder().setCustomId("amount").setLabel("Montant").setStyle(TextInputStyle.Short);
modal.addComponents(new ActionRowBuilder().addComponents(input));
return interaction.showModal(modal);
}

if(interaction.customId.startsWith("buy_")){
let item=interaction.customId.replace("buy_","");
let price=shop[item];
if(money[user]<price) return interaction.reply({content:"❌",ephemeral:true});
money[user]-=price; save();
log("🧾 Achat",`${interaction.user.username} ${item}`);
return interaction.reply({content:"✅ achat",ephemeral:true});
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
