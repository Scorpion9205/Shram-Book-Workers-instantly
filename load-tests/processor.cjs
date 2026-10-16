const fixtures = require("./fixtures.json");

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  setWorkerAuth(context, events, done) {
    context.vars.workerToken = pick(fixtures.workers).token;
    done();
  },
  setProviderAuth(context, events, done) {
    context.vars.providerToken = fixtures.provider.token;
    done();
  },
  setAgentAuth(context, events, done) {
    context.vars.agentToken = fixtures.agent.token;
    done();
  },
};
