/** @format */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const translate = require("deepl");
const config = require("./config");
const streamConfig = require("./stream-config");
const Twit = require("twit")
// const Parser = require("rss-parser");
// const fs = require("fs");

// Firestore reference for storing oauth2 states + refresh
const dbRef = admin.firestore().doc("tokens/demo");

// Twitter API init
const TwitterApi = require("twitter-api-v2").default;
const twitterClient = new TwitterApi({
	clientId: config.clientID,
	clientSecret: config.clientSecret,
});

// OpenAI API init
const { Configuration, OpenAIApi } = require("openai");
const Twit = require("twit");
const configuration = new Configuration({
	organization: config.organization,
	apiKey: config.API_key,
});
const openai = new OpenAIApi(configuration);

// don't forget to import this in twitter app on developer portal when deploying
// const callbackURL = "http://127.0.0.1:5001/black-beacon-335102/us-central1/callback";
const callbackURL =
	"https://us-central1-black-beacon-335102.cloudfunctions.net/callback";

// USER AUTHENTIFICATION
exports.auth = functions.https.onRequest(async (_request, response) => {
	const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
		callbackURL,
		{
			scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
		}
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

// TWEET BOT manual -> cron generated via google function scheduling
exports.tweet = functions.https.onRequest(async (request, response) => {
	const { refreshToken } = (await dbRef.get()).data();

	const {
		client: refreshedClient,
		accessToken,
		refreshToken: newRefreshToken,
	} = await twitterClient.refreshOAuth2Token(refreshToken);

	await dbRef.set({ accessToken, refreshToken: newRefreshToken });

	// openAI tweet prompt generator, logic is on openAI
	const promptDatabase = [
		"Generate a short Tweet that condemns sexism in advertisement. Include emojis.",
		"Generate a short Tweet that condemns women objectification in advertisement",
		"Generate a short Tweet which explains why sexism in advertisement can be harmful for society",
		"Write a short Tweet that is anti-sexist. Include an emoji.",
		"Write a short Tweet that quotes academic research about sexism",
		"Write a short Tweet that quotes academic research about gender inequality",
		"Write a short Tweet that quotes academic research about harmful effects of objectifying women in advertisement",
		"Write a short Tweet that quotes academic research about harmful effects of gender inequeality in advertisement",
		"Write a short Tweet that quotes academic research about harmful effects of sexism in advertisement",
		"Write a short Tweet that explains how to recognise sexism in advertisement",
		"Write a short Tweet that explains how to recognise if women are being objectified in advertisement",
		"Write a short Tweet that explains how to recognise sexism in advertisement",
		"Write a short Tweet which advises people how to battle sexism. Include a hashtag and an emoji.",
		"Write a short Tweet which advises people how to battle women objectification",
		"Write a short Tweet which advises people how to battle gender inequality",
		"Write a short Tweet which explains how sexism in advertisement supports rape culture",
		"Write a short Tweet which explains how are women objectified in advertisement and how that supports rape culture",
		"Write a short Tweet which explains what is rape culture and quotes scientific research about rape culture",
		"Write a short Tweet how to stand up against sexism as a male. Include an emoji.",
		"Write a short Tweet that raises a question about recent sexistic ads that others saw",
		"Write a short Tweet that asks about recent acts of sexism in everyday life",
		"Generate a Tweet that answers the following: How does sexism in advertisement negatively impact society?",
		"Generate a Tweet that answers the following: Can you present a scientific fact about gender inequality?",
		"Generate a Tweet that answers the following: How has feminism changed over time, and what impact has it had on society as a whole?",
		"Generate a Tweet in which you argument why it is important that man support women in everyday life",
		"Tweet a scientific fact about sexism:",
		"Tweet a scientific fact about feminism:",
		"Tweet a scientific fact about gender equality:",
		"Tweet a scientific fact about male gaze:",
		"Tweet a scientific fact about mansplaining:",
		"Tweet a scientific fact about sexism in advertisement:",
		"Tweet a scientific fact about rape culture:",
	];

	const randomPrompt =
		promptDatabase[Math.floor(Math.random() * promptDatabase.length)];

	// generate openAI tweet according to logic on model stored in your account
	// include settings and tweeking - more in API docs
	const openaiResponse = await openai.createCompletion("text-davinci-002", {
		prompt: randomPrompt,
		max_tokens: 64,
		temperature: 0.9,
		presence_penalty: 1.5,
		frequency_penalty: 0.7,
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
			auth_key: config.auth_key, // do not steal this!
			split_sentences: "0", // no /n and other shit
		});
	} catch (e) {
		console.log(e);
	}
	let translations;

	if (result.data && result.data.translations) {
		translations = result.data.translations;
	}
	console.log(translations); // check if works - here I am not sure what type of object I am getting
	// it looks like json but it might be object or array or whatever, I'm so fucked up with data types
	// in js after those last two days... very annoying

	if (translations && translations.length) {
		const myText = translations.map((translate) => translate.text);
		let stringTweet = myText.toString();
		console.log(stringTweet);
		const { data } = await refreshedClient.v2.tweet(stringTweet);
		response.send(data);
	} else {
		const myText =
			"Bohužel je pro tento Tweet moje AI rozbitá. @FortTadeas by se měl nakopat do zadku a spravit mě! #baddev";
		let stringTweet = myText.toString();
		console.log(stringTweet);
		const { data } = await refreshedClient.v2.tweet(stringTweet);
		response.send(data);
	}
});

// liking and retweeter bot
exports.retweet = functions.https.onRequest(async (request, response) => {
	const {
		client: refreshedClient,
		accessToken,
		refreshToken: newRefreshToken,
	} = await twitterClient.refreshOAuth2Token(refreshToken);

	await dbRef.set({ accessToken, refreshToken: newRefreshToken });

	const streamy = new Twit(streamConfig);

	const stream = streamy.stream("statuses/filter", { track: phrase })
	stream.on("tweet", tweetID);

	const phrase = "I feel like I";
	const regex = ""

	let tweetID;
	try  {
		if (regex.test(tweet.text)) {
			return tweetID = tweet.id_str;
		}
		else { 
			console.log("didnt manage to grab a tweet")
		}
	}
	catch (e) {
		console.log(e);
	};

	const { data } = await refreshedClient.v2.retweet(tweetID);
	response.send(data);
}
/*
// TWEET BOT manual
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
	const openaiResponse = await openai.createCompletion("text-davinci-002", {
		prompt: randomPrompt,
		max_tokens: 64,
		temperature: 0.9,
		presence_penalty: 1.5,
		frequency_penalty: 0.7,
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
			split_sentences: "0", // no /n and other shit
		});
	} catch (e) {
		console.log(e);
	}
	let translations;

	if (result.data && result.data.translations) {
		translations = result.data.translations;
	}
	console.log(translations); // check if works - here I am not sure what type of object I am getting
	// it looks like json but it might be object or array or whatever, I'm so fucked up with data types
	// in js after those last two days... very annoying

	if (translations && translations.length) {
		const myText = translations.map((translate) => translate.text);
		let stringTweet = myText.toString();
		console.log(stringTweet);
		const { data } = await refreshedClient.v2.tweet(stringTweet);
		response.send(data);
	} else {
		const myText =
			"Bohužel je pro tento Tweet moje AI rozbitá. @FortTadeas by se měl nakopat do zadku a spravit mě! #baddev";
		let stringTweet = myText.toString();
		console.log(stringTweet);
		const { data } = await refreshedClient.v2.tweet(stringTweet);
		response.send(data);
	}
});
*/

// RSS Feed NEWS bot
/*
exports.tweet = functions.https.onRequest(async (request, response) => {
  const { refreshToken } = (await dbRef.get()).data();

  const {
    client: refreshedClient,
    accessToken,
    refreshToken: newRefreshToken,
  } = await twitterClient.refreshOAuth2Token(refreshToken);

  await dbRef.set({ accessToken, refreshToken: newRefreshToken });

  (async function main() {
    // make new RSS parser
    const parser = new Parser();

    // get all the items in RSS feed
    const feed =  await parser.parseURL("http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"); // BBC art&entertainment
    
    let items = [];

    // clean up the string and replace reserved characters
    const bbcArtTech = `${feed.title.replace(/\s+/g, "-").replace(/[/\\?%*:|"<>]/g, '').toLowerCase()}.json`;
    if (fs.existsSync(bbcArtTech)) {
      items = require(`./${bbcArtTech}`);
    }

    // Add the items to the items array
    await Promise.all(feed.items.map(async (currentItem) => {

      // Add a new item if it doesn't already exist
      if (items.filter((item) => isEquivalent(item, currentItem)).length <= 0) {
          items.push(currentItem);
      }
    
    }));

     // Save the file
    fs.writeFileSync(fileName, JSON.stringify(items));




  })();
  

});
*/
