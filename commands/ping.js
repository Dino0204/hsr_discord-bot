const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("pong이라고 응답합니다."),
  run: ({ interaction }) => {
    interaction.reply("Pong!");
  },
};

// setName() 함수 안에는 입력할 명령어의 이름을 문자열로 넣어주고, 
// setDescription()함수 안에는 명령어의 설명을 적어준다. 
// run 필드에는 해당 명령어가 호출되었을 때 실행할 함수를 넣으면 된다. 
// 위 코드에서는 Pong!이라고 응답하도록 작성했다.