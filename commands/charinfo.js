const axios = require("axios");
const cheerio = require("cheerio");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("캐릭터정보")
    .setDescription("캐릭터 정보를 출력합니다.")
    .addStringOption((option) =>
      option
        .setName("닉네임")
        .setDescription("정보를 가져올 캐릭터의 닉네임")
        .setRequired(true)
    ),
  run: async ({ interaction }) => {
    try {
      
      const nickName = interaction.options.get("닉네임").value;
  
      const fetchPage = async (name) => {
        const url = `https://namu.wiki/w/${encodeURIComponent(name)}`;
        const html = await axios.get(url);
        const $ = cheerio.load(html.data);
        return { $, url };
      };
  
      let { $, url } = await fetchPage(nickName);
  
      const disambigLink = $("a").filter((i, el) => $(el).text().includes("동음이의어")).attr("href");
  
      const honkaiLink = $("a").filter((i, el) => $(el).text().includes(`${nickName}(붕괴: 스타레일)`)).attr("href");
  
      if (disambigLink || honkaiLink) {
        const newQuery = `${nickName}(붕괴: 스타레일)`;
        ({ $, url } = await fetchPage(newQuery));
      }
  
      const clean = (txt) => txt.replace(/\(.*?\)/g, "").trim();
  
      // 캐릭터 이미지
      let charImg =
        $(`img[alt^="스타레일 ${nickName}"]`).attr("src") ||
        $(`img[alt^="스타레일 ${nickName}"]`).attr("data-src") ||
        $(`img[alt^="${nickName} 캐릭터 카드"]`).attr("src") ||
        $(`img[alt^="${nickName} 캐릭터 카드"]`).attr("data-src");

      if (charImg && charImg.startsWith("//")) {
        charImg = "https:" + charImg;
      }
  
      const result = {};
      $("tr").each((i, el) => {
        const tds = $(el).find("td");
  
        if (tds.length === 2) {
          const key = $(tds[0]).text().trim();
          let value = $(tds[1]).text().trim();
  
          if (["이름", "본명", "속성"].includes(key)) {
            result[key] = clean(value);   
  
            const img = $(tds[1]).find("img").last().attr("data-src") || $(tds[1]).find("img").last().attr("src");
            if (img) {
              result[`${key}_img`] = img.startsWith("//") ? "https:" + img : img;
            }
          }
        }
      });
  
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`${nickName}`)
        .setURL(url)
        .setAuthor({
          name: `${result["속성"]}`,
          iconURL: result["속성_img"],
          url: `${result["속성_img"]}`,
        })
        .setImage(charImg)

        .setTimestamp()
        .setFooter({
          text: "출처: 나무위키",
          iconURL: "https://i.namu.wiki/i/ymOuaWQHtOt_arYO_IPuECD7yQpryRse_FJ1YeDR-oZkce0sTFeIQ9HZWQBOGXDLgoDQubzwm2CJoQl6dUJO9jfyqCfvqtPlOzxFMdnJ88f4DdOZFG2Ik-xIEZQ9pvmSFWXPFKTJQhaDB3POggaEEA.svg",
        });
  
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.log("Error")
    }
  },
};
