/**
 * TODO(developer):
 * Add your service key to the current folder.
 * Uncomment and fill in these variables.
 */
const slackSigningSecret = '23b2412f2b960fdfdcfff079a1301fc0';
const slackToken = 'xoxb-5845921362739-5846162220562-K8bzMc0EKEq2C9LQbQNVkBFj';
const projectId = 'uber-poc-397822';
const locationId = 'global';
const agentId = '95c6a58e-3d5f-4fd1-8ab6-09cf8b2b7828';
const languageCode = 'en';
const port = process.env.PORT || 8080;
const hostname = '0.0.0.0';
const structProtoToJson =
    require('../../botlib/proto_to_json.js').structProtoToJson;

const {WebClient} = require('@slack/web-api');
const {createEventAdapter} = require('@slack/events-api');

const slackEvents = createEventAdapter(slackSigningSecret);
const slackClient = new WebClient(slackToken);

// Imports the Google Cloud Some API library
const {SessionsClient} = require('@google-cloud/dialogflow-cx');
/**
 * Example for regional endpoint:
 *   const locationId = 'us-central1'
 *   const client = new SessionsClient({apiEndpoint:
 * 'us-central1-dialogflow.googleapis.com'})
 */
const client = new SessionsClient(
    {apiEndpoint: locationId + '-dialogflow.googleapis.com'});

/**
 * Converts Slack request to a detectIntent request.
 */
function slackToDetectIntent(slackRequest, sessionPath) {
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: slackRequest.text,
      },
      languageCode,
    },
  };

  return request;
}

/**
 * Takes as input a request from Slack and converts the request to
 * detectIntent request which is used to call the detectIntent() function
 * and finally output the response given by detectIntent().
 */
async function detectIntentResponse(slackRequest) {
  const sessionId = slackRequest.channel;
  const sessionPath = client.projectLocationAgentSessionPath(
      projectId, locationId, agentId, sessionId);
  console.info(sessionPath);

  request = slackToDetectIntent(slackRequest, sessionPath);
  const [response] = await client.detectIntent(request);

  return response;
};

async function convertToSlackMessage(responses, channel_id) {
  let replies = [];

  for (let response of responses.queryResult.responseMessages) {
    let reply;

    switch (true) {
      case response.hasOwnProperty('text'): {
        reply = {channel: channel_id, text: response.text.text.join()};
      } break;

      /**
       * For information on the layouts for rich messages on Slack,
       * please visit https://api.slack.com/messaging/composing/layouts
       */
      case response.hasOwnProperty('payload'): {
        reply = await structProtoToJson(response.payload);
        reply['channel'] = channel_id;
      } break;

      default:
    }
    if (reply) {
      replies.push(reply);
    }
  }

  return replies;
}

/**
 * Checks if the request is coming from a bot and if it is not
 * it will call detectIntentResponse() with the request as the input
 * and outputs the response. The initial check to make
 * sure the request is not from a bot is there to prevent the Integration
 * from replying to its own messages.
 */
async function eventToRequest(event, channel_id) {
  if (event.bot_id == '' || event.bot_id == null) {
    const response = await detectIntentResponse(event);
    var requests = await convertToSlackMessage(response, channel_id);
    for (req of requests) {
      try {
        await slackClient.chat.postMessage(req)
      } catch (error) {
        console.log(error.data)
      }
    }
  };
};

// Listens for messages posted in instant messages.
slackEvents.on('message', (event) => {
  (async () => {
    await eventToRequest(event, event.user);
  })();
});

// Listens for messages that mention the Slack App in channals
slackEvents.on('app_mention', (event) => {
  (async () => {
    await eventToRequest(event, event.channel);
  })();
});

slackEvents.on('error', console.error);

slackEvents.start(process.env.PORT)
    .then(() => {console.log(`Server started on port ${process.env.PORT}`)});

module.exports = {
  slackToDetectIntent,
  convertToSlackMessage
};
