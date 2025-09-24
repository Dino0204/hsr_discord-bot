const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.user.setActivity({
    name: "「완·매」와 창조물 제작",
    type: ActivityType.Playing,
  });
};