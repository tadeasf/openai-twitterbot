const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const translate = require("deepl");

// Firestore reference for storing oauth2 states + refresh
const dbRef = admin.firestore().doc("tokens/demo");

// Twitter API init
const TwitterApi = require("twitter-api-v2").default;
const twitterClient = new TwitterApi({
  clientId: "Yk9WWVdEX2RWOUQ3Y1B3SWlBZzE6MTpjaQ",
  clientSecret: "dz6ChUCtU3VrR-4oDw02s8MH2j808dmBGpDhpNwQ14IBDEAhmu",
});

// OpenAI API init
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  organization: "org-xGhGkhzFmS0ZZ65TpWTLC9jO",
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

// openAI tweet prompt generator, logic is on openAI
const promptDatabase = [
  "Generate a short Tweet that condemns sexism in advertisement",
  "Generate a short Tweet that condemns women objectification in advertisement",
  "Generate a short Tweet which explains why sexism in advertisement can be harmful for society",
  "Generate a short Tweet about sexism in advertisement",
  "Generate a short Tweet about objectification of women in advertisement",
  "Write a short Tweet that is anti-sexist",
  "Write a short Tweet that quotes academic research about sexism",
  "Write a short Tweet that quotes academic research about gender inequality",
  "Write a short Tweet that quotes academic research about harmful effects of objectifying women in advertisement",
  "Write a short Tweet that quotes academic research about harmful effects of gender inequeality in advertisement",
  "Write a short Tweet that quotes academic research about harmful effects of sexism in advertisement",
  "Write a short Tweet that explains how to recognise sexism in advertisement",
  "Write a short Tweet that explains how to recognise if women are being objectified in advertisement",
  "Write a short Tweet that explains how to recognise sexism in advertisement",
  "Write a short Tweet which advises people how to battle sexism",
  "Write a short Tweet which advises people how to battle women objectification",
  "Write a short Tweet which advises people how to battle gender inequality",
  "Write a short Tweet which advises people how to battle sexism",
  "Write a short Tweet which explains how sexism in advertisement supports rape culture",
  "Write a short Tweet which explains how are women objectified in advertisement and how that supports rape culture",
  "Write a short Tweet which explains what is rape culture",
  "Write a short Tweet how to stand up against sexism as a male",
  "Write a short Tweet that raises a question about recent sexistic ads that others saw",
  "Write a short Tweet that asks about recent acts of sexism in everyday life",
  "Generate a Tweet about: How does sexism in advertisement negatively impact society?",
  "Generate a Tweet about: How does sexism in advertisement affect the way we view women?",
  "Generate a Tweet about: How does sexism in advertisement lead to unrealistic standards for women?",
  "Generate a Tweet about: How does objectification of women in advertisements create a harmful culture?",
  "Generate a Tweet about: how does the sexualization of women in advertisements perpetuate harmful stereotypes?",
  "Generate a Tweet about: How do body-shaming advertisements featuring women harm both men and women?",
  "Generate a Tweet about: How do sexist humor andShockvertising techniques used in advertisements demean and objectify women?",
  "Generate a Tweet about: What are the negative consequences of Always' #LikeAGirl ad campaign?",
  "Generate a Tweet about: Procter & Gamble's Like a Girl Ad: Harmful or Helpful?",
  "Generate a Tweet about: How did Barbie's new I'm a computer engineer ad campaign contribute to sexist attitudes towards girls and STEM careers?",
  "Generate a Tweet about: Nike's Just Do It ad campaign: Empowering or sexist?",
  "Generate a Tweet about: Under Armour's I Will What I Want ad campaign: A step forward or backward for women's representation in sports advertising?",
  "Generate a Tweet about: Gatorade's Sweat Like a Girl ad campaign: Harmless fun or harmful to girls' self-esteem?",
  "Generate a Tweet about: I'm not a feminist, but... Why more and more young women are rejecting the label",
  "Generate a Tweet about: The Bechdel test: Does Hollywood need to do better when it comes to representing female characters in movies?",
  "Generate a Tweet about: Why Hollywood still has a long way to go when it comes to gender equality  behind the scenes",
  "Generate a Tweet about: In what ways does objectifying women in advertisement negatively affect academic performance?",
  "Generate a Tweet about: What are the harmful effects of objectifying women in advertisement?",
  "Generate a Tweet about: What impact does objectifying women in advertisement have on academic success?",
  "Generate a Tweet about: Is Objectifying Women in Advertising Harmful?",
  "Generate a Tweet about: How Does Objectifying Women in Advertising Affect Women's Body Image?",
  "Generate a Tweet about: The Dangers of Objectifying Women in Advertising.",
  "Generate a Tweet about: How Sexualization in Advertising hurts women.",
  "Generate a Tweet about: Is it ever okay to use sexist language?",
  "Generate a Tweet about: What are the consequences of using sexist language in the workplace?",
  "Generate a Tweet about: How can we make sure that everyone is treated fairly at work, regardless of their gender?",
  "Generate a Tweet about: What should you do if you witness someone being harassed or discriminated against at work?",
  "Generate a Tweet about: What can we do to create a more inclusive environment at work for all employees?",
  "Generate a Tweet about: What is the definition of sexism?",
  "Generate a Tweet about: How can sexist behaviors be harmful?",
  "Generate a Tweet about: What are some examples of sexist behaviors?",
  "Generate a Tweet about: How can we prevent sexism in our lives?",
  "Generate a Tweet about: How can we respectfully stand up against sexist behaviors when we witness them?",
  "Generate a Tweet about: What are some things that you can do if you experience or witness sexism in your workplace?",
  "Generate a Tweet about: What is an example of sexism in advertisement?",
  "Generate a Tweet about: How is sexism in advertisement harmful to society?",
  "Generate a Tweet about: Why do people believe that sexist advertising is okay?",
  "Generate a Tweet about: How can we stop sexism in advertisement?",
  "Generate a Tweet about: Who benefits from sexist advertisements?",
  "Generate a Tweet about: What does sexist advertising say about our culture?",
  "Generate a Tweet about: Is it ever okay to use sexist language or imagery in advertising?",
  "Generate a Tweet about: Under what circumstances, if any, is it acceptable to use sexist humour in advertising?",
  "Generate a Tweet about: What are some of the potential consequences of using sexist language or imagery in advertising?",
  "Generate a Tweet about: 'Locker room talk' - Is it ever appropriate to use this phrase in an advertoring campaign aimed at a general audience?",
  "Generate a Tweet about: When is it appropriate to use the word 'feminist'",
  "Generate a Tweet about: What are some common ways that people can be sexist?",
  "Generate a Tweet about: How can feminism make the world a better place for everyone?",
  "Generate a Tweet about: What do feminists believe in?",
  "Generate a Tweet about: How can I be a good ally to feminists?",
  "Generate a Tweet about: What is toxic masculinity and why is it harmful?",
  "Generate a Tweet about: Why is the patriarchy bad for everyone, not just women?",
  "Generate a Tweet about: What are some things we take for granted that come from living in a patriarchal society?",
  "Generate a Tweet about: How does sexism affect men as well as women?",
  "Generate a Tweet about: What are the consequences of sexism?",
  "Generate a Tweet about: How does the increased objectification of women in media lead to more permissive attitudes towards violence against them?",
  "Generate a Tweet about: What is the correlation between sexist attitudes and acceptance of rape myths?",
  "Generate a Tweet about: What psychological effects does viewing sexist advertising have on children, particularly girls?",
  "Generate a Tweet about: To what extent do mass media perpetuate or challenge gender stereotypes and inequalities?",
  "Generate a Tweet about: Does exposure to traditional gender roles in the media hinder women's career aspirations and sense of self-efficacy?",
  "Generate a Tweet about: What is the definition of 'sexism'?",
  "Generate a Tweet about: What are some examples of sexist attitudes or behaviours?",
  "Generate a Tweet about: How does sexism affect women and men?",
  "Generate a Tweet about: Is there a difference between sex and gender?",
  "Generate a Tweet about: What is gender inequality?",
  "Generate a Tweet about: Can you present a scientific fact about gender inequality?",
  "Generate a Tweet about: How has feminism changed over time, and what impact has it had on society as a whole?",
  "Generate a Tweet about: Are there different types of feminism?"
];

const randomPrompt = promptDatabase[Math.floor(Math.random() * promptDatabase.length)];

// don't forget to import this in twitter app on developer portal when deploying
// const callbackURL = "http://127.0.0.1:5001/black-beacon-335102/us-central1/callback";
const callbackURL = "https://us-central1-black-beacon-335102.cloudfunctions.net/callback";

// USER AUTHENTIFICATION
exports.auth = functions.https.onRequest(async (_request, response) => {
  const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
    callbackURL,
    { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
  );
  // store verifier
  await dbRef.set({ codeVerifier, state });

  response.redirect(url);
});

// CALLBACK FOR TWITTER AUTH2
exports.callback = functions.https.onRequest(async (request, response) => {
  const { state, code } = request.query;

  const dbSnapshot = await dbRef.get();
  const { codeVerifier, state: storedState } = dbSnapshot.data();

  if (state !== storedState) {
    return response.status(400).send("You fucked up! Go and smack yourself!");
  }

  const {
    client: loggedClient,
    accessToken,
    refreshToken,
  } = await twitterClient.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: callbackURL,
  });

  await dbRef.set({ accessToken, refreshToken });

  const { data } = await loggedClient.v2.me(); // I can think about what access to give next time when improving the app

  response.send(data);
});

// TWEET BOT
exports.tweet = functions.https.onRequest(async (request, response) => {
  const { refreshToken } = (await dbRef.get()).data();

  const {
    client: refreshedClient,
    accessToken,
    refreshToken: newRefreshToken,
  } = await twitterClient.refreshOAuth2Token(refreshToken);

  await dbRef.set({ accessToken, refreshToken: newRefreshToken });

  // generate openAI tweet according to logic on model stored in your account
  // include settings and tweeking - more in API docs
  const openaiResponse = await openai.createCompletion('text-davinci-002', {
    prompt: randomPrompt,
    max_tokens: 64,
    temperature: 0.9,
    top_p: 0.9,
    presence_penalty: 0.6,
    frequency_penalty: 0.7
  });
  const aiTweetgen = openaiResponse.data.choices[0].text;
  console.log(aiTweetgen); // check if works


  let result;
  try {
    // consult the package, it's using deprecated query-string instead of urlsearchparams
    // considering updating the application as the AI of this model is very good, best translator, almost native
    result = await translate({
      free_api: true,
      text: aiTweetgen,
      target_lang: "CS",
      auth_key: "e827c980-8a22-0448-5d56-5de4d0cf20a9:fx", // do not steal this!
      split_sentences: "0" // no /n and other shit
    })
  } catch (e) {
    console.log(e)
  }
  let translations;

  if (result.data && result.data.translations) {
    translations = result.data.translations
  }
  console.log(translations); // check if works - here I am not sure what type of object I am getting
  // it looks like json but it might be object or array or whatever, I'm so fucked up with data types
  // in js after those last two days... very annoying

  if (translations && translations.length) {
    const myText = translations.map(translate => translate.text);
    let stringTweet = myText.toString();
    console.log(stringTweet);
    const { data } = await refreshedClient.v2.tweet(stringTweet);
    response.send(data);
  } else {
    const myText = "Bohužel je pro tento Tweet moje AI rozbitá. @FortTadeas by se měl nakopat do zadku a spravit mě! #baddev";
    let stringTweet = myText.toString();
    console.log(stringTweet);
    const { data } = await refreshedClient.v2.tweet(stringTweet);
    response.send(data);
  };
});


// TODO: improve prompts!
// TODO: include emojis.  
// TODO: add cron function for periodic tweeting
// TODO: RSS feed: scrape URLs for headers/titles -> pass to vaderSentiment -> positive titles ->
// -> randomize -> most positive title wins -> pass title to openAI with prefix: give me your opinion about this title
// -> translate -> tweet the URL
    // -> https://www.geeksforgeeks.org/extract-feed-details-from-rss-in-python/ 
    // -> feed title to openAI -> classify -> pick most positive
    // -> openAI -> give me your opinion about this title
// TODO: include: liking, following, retweeting + schedule
// TODO: include: tweeting generated images with text (I saw it in one repo, forked it)
// TODO: include: responding to tweets that end with question mark via openai
// that would be probably much easier to do in python because I know syntax for twitter api better
// FINAL PRODUCT