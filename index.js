const TELEGRAM_API = require('node-telegram-bot-api');

const TOKEN = '6618117995:AAGUnbGjAxQlQB09XR0bqkUcyPEDR_RW3VU';

const BOT = new TELEGRAM_API(TOKEN, {polling: true});

const fs = require('fs');

const DEFAULT_KEYWORDS = [
  "клоун", "клоунеса", "клоуном",
  "клоунами", "канатоходець", "арена",
  "цирк", "цирковий", "трюк",
  "трюкацтво", "циркач", "циркацький",
  "купол", "виступ", "акробатами",
  "виступати", "гастролі", "гастролювати",
  "circus", "acrobat", "trapeze",
  "juggler", "ringmaster", "tightrope",
  "performer", "carnival", "акробат",
  "жонглер", "фокусник", "блазень",
  "сашко", "clown"
];

const COMMANDS = [
  { text: '/start', action: onStart },
  { text: '/my_statistics', action: showPersonalStatistics },
  { text: '/leaderbord', action: showLeaderboard },
  { text: '/everyone', action: pingEveryone },
  { text: '/clown_test', action: clownTest },
  { text: '/clown_blessing', action: clownBlessing },
  { text: '/view_circus_keywords', action: showCircusKeywords },
  { text: '/to_default_circus_keywords', action: toDefaultCircusKeywords },
];

const CUSTOM_COMMANDS = [
  { prefix: '/clown_curse', action: clownCurse },
  { prefix: '/add_custom_circus_keywords', action: addCustomCircusKeywords },
  { prefix: '/delete_circus_keywords', action: deleteCircusKeywords },
];

const WORD_COUNT_FILE_NAME = 'wordCountByUser.txt';

const CIRCUS_KEYWORDS_FILE_NAME = 'circusKeywords.json';

const CURSED_USER_FILE_NAME = 'cursedUsers.json';

let circusKeywords = [];
let wordCountByUser = {};
let chatId;
let userId;
let messageText;
let msg;
let chatUserId;
let allUserInChat = [];
let cursedUsers = {};

BOT.setMyCommands([
    {command:'/start', description: "старт бота"},
    {command:'/my_statistics', description: "показує персональну статистику використання слів пов'язаних з цирком"},
    {command:'/leaderbord', description: "показує табличку лідерів по використанню клоунських слів"},
    {command:'/everyone', description: "пінгує всіх клоунів у чаті"},
    {command:'/clown_test', description: "тест на клоуна"},
    {command:'/add_custom_circus_keywords', description: "можливість додати своє слово"},
    {command:'/delete_circus_keywords', description: "можливість видалити слово"},
    {command:'/view_circus_keywords', description: "показує всі слова які рахуються циркацькими"},
    {command:'/to_default_circus_keywords', description: "вертає слова до дефолту"},
    {command:'/clown_curse', description: "прокляття клоуна"},
    {command:'/clown_blessing', description: "благословення клоуна(виліковує прокляття)"},
])

wordCountByUser = tryToLoadFile(WORD_COUNT_FILE_NAME, {});

circusKeywords = tryToLoadFile(CIRCUS_KEYWORDS_FILE_NAME, DEFAULT_KEYWORDS);

cursedUsers = tryToLoadFile(CURSED_USER_FILE_NAME,{})

BOT.on('message', async messageInfo=>{

    msg = messageInfo;
    chatId = msg.chat.id;
    userId = msg.from.id;
    messageText = msg.text;
    chatUserId = userId+"chatid"+chatId;

  
    for (const key in wordCountByUser) {
        if (key.includes(chatId)) {
            allUserInChat.push({ "id": key, "rating": wordCountByUser[key] });
        }
    }
     
     onMessageSent()
      
      for (const cmd of COMMANDS) {
        if (messageText === cmd.text || messageText === `${cmd.text}@bad_clown_bot`) {
          cmd.action();
          break;
        }
      }
      
      for (const customCmd of CUSTOM_COMMANDS) {
        if (messageText.startsWith(`${customCmd.prefix} `) || messageText.startsWith(`${customCmd.prefix}@bad_clown_bot `)) {
          customCmd.action();
          break;
        }
      }
      
      if (cursedUsers['@' + msg.from.username]) {
        await BOT.sendMessage(chatId, `@${msg.from.username} is a clown.`);
      }

      
      allUserInChat.length = 0;

});

async function onMessageSent()
{
  const words = messageText.toLowerCase().split(/\s+/);
    
  let circusWordCount = 0;

    for (const word of words) {
        for (const relatedWord of circusKeywords) {
            const distance = levenshteinDistance(word, relatedWord);
            if ((distance <= 2 || word.includes(relatedWord)|| word==="🤡")&& !word.includes('/')) { 
                circusWordCount++;
                break;
            }
          
        }
    }

    if (!wordCountByUser[chatUserId]) {
      wordCountByUser[chatUserId] = 0;
    }
    wordCountByUser[chatUserId] += circusWordCount;

    saveFile(WORD_COUNT_FILE_NAME, wordCountByUser);
}

async function onStart()
{
  await BOT.sendMessage(chatId, "цей бот буде показувати статистику по використаню циркових слів в групі і вести табличку лідерів"); 
}

async function showPersonalStatistics()
{
  await BOT.sendMessage(chatId, ("цей циркач: "+ msg.from.first_name +" (@"+ msg.from.username+")"+ '\n' +"використав: "+ wordCountByUser[chatUserId] +" циркових слів" )); 
}

async function showLeaderboard()
{
  let output = "🏆 табличка лідерів чату " + msg.chat.title + ":";
        
        function compare(a, b) {
            if (a.rating > b.rating) {
                return -1;
            }
            if (a.rating < b.rating) {
                return 1;
            }
            return 0;
        }
        
        allUserInChat.sort(compare);
        
        let i = 0;
        let medals = ['🥇', '🥈', '🥉'];
        
        for (const element of allUserInChat) {
            const UserID = await BOT.getChatMember(chatId, element.id.split('chatid')[0]);
        
            output += '\n' + (i + 1) + '. ' + (i >= 3 ? "" : medals[i]) + UserID.user.first_name + " (@" + UserID.user.username + ")" + " з результатом: " + element.rating;
            i++;
        }
        
        await BOT.sendMessage(chatId, output);
          
}

async function pingEveryone()
{
  let message = '📢🚨 Attention all the clowns of the country are gathering!\n';
   
  for (const element of allUserInChat) {
      const UserID = await BOT.getChatMember(chatId, element.id.split('chatid')[0]);
  
      message += '\n'+ "@" + UserID.user.username;
  }

    await BOT.sendMessage(chatId, message);
}

async function clownTest()
{
  let randomInt =msg.from.username=='shoniko22'?100:Math.floor(Math.random() * 101);
        
            await BOT.sendMessage(chatId,`@${msg.from.username} passed the clown test with `+randomInt+"% score");
}

async function clownBlessing()
{
  if (cursedUsers['@'+msg.from.username]) {
    delete cursedUsers['@'+msg.from.username];
    await BOT.sendMessage(chatId, `@${msg.from.username} has been blessed and is no longer a clown.`);
  } else {
    await BOT.sendMessage(chatId, `You are not currently cursed as a clown.`);
  }
  saveFile(CURSED_USER_FILE_NAME,cursedUsers);
}

async function clownCurse()
{
  const cursedUser = messageText.split(' ')[1];

  if(cursedUsers[cursedUser])
  {
    await BOT.sendMessage(chatId, `${cursedUser} already cursed`);
    return;
  }

  cursedUsers[cursedUser] = true;
  await BOT.sendMessage(chatId, `${cursedUser} has been cursed as a clown.`);
  saveFile(CURSED_USER_FILE_NAME,cursedUsers);
}

async function addCustomCircusKeywords()
{
  let toDelete = messageText.includes('/add_custom_circus_keywords ') ? '/add_custom_circus_keywords ' : '/add_custom_circus_keywords@bad_clown_bot ';
  let customKeywords = messageText.replace(toDelete, '').split(' ');
  let output = "";

  const newKeywords = customKeywords.filter(keyword => !circusKeywords.includes(keyword));
  
  console.log("sadasd")

  if (newKeywords.length > 0) {
    circusKeywords.push(...newKeywords);
    await BOT.sendMessage(chatId,"✅ Added custom circus keywords:\n" + newKeywords.join(', '));
    saveFile(CIRCUS_KEYWORDS_FILE_NAME, circusKeywords);
    return;
  } else {
    await BOT.sendMessage(chatId,"🚫 some keywords already exist in the list.");
  }

  await BOT.sendMessage(chatId,output);
}

async function showCircusKeywords()
{
  const keywordList = circusKeywords.join(', ');
  await BOT.sendMessage(chatId, '👀Current circus keywords:'+'\n'+ keywordList);
}

async function deleteCircusKeywords()
{
  const toDelete = messageText.startsWith('/delete_circus_keywords ') ? '/delete_circus_keywords ' : '/delete_circus_keywords@bad_clown_bot ';
        const keywordsToDelete = messageText.replace(toDelete, '').split(' ').map(keyword => keyword.trim()).filter(keyword => keyword !== '');
        const deletedKeywords = [];
        
        for (const keyword of keywordsToDelete) {
          const index = circusKeywords.indexOf(keyword);
          if (index !== -1) {
            circusKeywords.splice(index, 1);
            deletedKeywords.push(keyword);
          }
        }
        
        if (deletedKeywords.length > 0) {
          await BOT.sendMessage(chatId, `❌ Deleted circus keywords: ${deletedKeywords.join(', ')}`);
          saveFile(CIRCUS_KEYWORDS_FILE_NAME, circusKeywords);
          return;
        } else {
          await BOT.sendMessage(chatId, `No matching circus keywords found for: ${keywordsToDelete.join(', ')}`);
        }
}

async function toDefaultCircusKeywords()
{
  circusKeywords = DEFAULT_KEYWORDS;
  await BOT.sendMessage(chatId, '🔄 Circus keywords have been reset to default.');
  saveFile(CIRCUS_KEYWORDS_FILE_NAME, circusKeywords);
  return;
}

function saveFile(fileName, dataToSave)
{
  fs.writeFileSync(fileName,JSON.stringify(dataToSave, null, 2));
}

function tryToLoadFile(fileName, dataLoadOnFail)
{
    if (fs.existsSync(fileName)) {
      const existingData = fs.readFileSync(fileName, 'utf8');
      return JSON.parse(existingData);
    } 
    else {
      return dataLoadOnFail;
    }
}

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, 
                    matrix[i][j - 1] + 1,     
                    matrix[i - 1][j] + 1     
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

