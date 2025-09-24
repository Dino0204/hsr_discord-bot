const axios = require("axios");
const cheerio = require("cheerio");
const { SlashCommandBuilder, EmbedBuilder, GuildScheduledEventPrivacyLevel, GuildScheduledEventEntityType } = require("discord.js");

// 날짜 파싱 함수
function parseDate(dateStr) {
  try {
    // "2025년 9월 24일" 형태를 Date 객체로 변환
    const match = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return null;
  } catch (error) {
    console.error('날짜 파싱 오류:', error);
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("워프정보")
    .setDescription("현재 진행중인 캐릭터 이벤트 워프 정보를 가져옵니다.")
    .addBooleanOption(option =>
      option.setName("이벤트등록")
        .setDescription("Discord 서버 이벤트로 자동 등록할지 선택")
        .setRequired(false)
    ),
  
  run: async ({ interaction }) => {
    try {
      await interaction.deferReply(); // 처리 시간이 길 수 있으니 defer
      
      const url = "https://namu.wiki/w/%EB%B6%95%EA%B4%B4:%20%EC%8A%A4%ED%83%80%EB%A0%88%EC%9D%BC/%EC%9B%8C%ED%94%84/%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%9D%B4%EB%B2%A4%ED%8A%B8%20%EC%9B%8C%ED%94%84";
      
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // 워프 테이블 구조 기반으로 정보 추출
      const warpSections = [];
      
      // 워프 테이블들을 찾기 (table.OngyTv+l)
      $("table").each((tableIndex, table) => {
        const $table = $(table);
        
        // 워프 테이블인지 확인 (테두리 스타일이 있는 테이블)
        if (!$table.attr('style') || !$table.attr('style').includes('border')) return;
        
        // console.log(`=== 테이블 ${tableIndex} 분석 ===`);
        
        let warpTitle = "";
        let warpImage = "";
        let warpPeriod = "";
        let characters = [];
        
        // 첫 번째 행에서 워프 제목 추출
        const titleRow = $table.find('tr').first();
        const titleCell = titleRow.find('td').first();
        if (titleCell.length) {
          warpTitle = titleCell.text().trim();
          // console.log(`워프 제목: ${warpTitle}`);
        }
        
        // 두 번째 행에서 워프 이미지 추출
        const imageRow = $table.find('tr').eq(1);
        const imageCell = imageRow.find('td').first();
        if (imageCell.length) {
          const $warpImg = imageCell.find('img[alt*="스타레일"]').last(); // 메인 워프 이미지
          if ($warpImg.length) {
            let imgSrc = $warpImg.attr('src') || $warpImg.attr('data-src');
            if (imgSrc && imgSrc.startsWith("//")) {
              imgSrc = "https:" + imgSrc;
            }
            warpImage = imgSrc;
            // console.log(`워프 이미지: ${imgSrc ? '있음' : '없음'}`);
          }
        }
        
        // 테이블 이후의 모든 형제 요소들에서 ul을 찾아서 정보 추출
        const $tableParent = $table.closest('div');
        
        // 테이블이 포함된 div의 다음 형제들에서 ul 찾기
        $tableParent.nextAll().each((nextIndex, nextEl) => {
          const $nextEl = $(nextEl);
          
          // ul 요소를 직접 찾거나, 내부에 ul이 있는 div 찾기
          let $ulElements = $nextEl.is('ul') ? $nextEl : $nextEl.find('ul');
          
          $ulElements.each((ulIndex, ul) => {
            const $ul = $(ul);
            
            $ul.find('li').each((liIndex, li) => {
              const $li = $(li);
              const liText = $li.text().trim();
              
              // console.log(`li 텍스트: ${liText.substring(0, 100)}...`);
              
              // 워프 기간 정보 추출
              if (liText.includes('이벤트 워프 기간:')) {
                warpPeriod = liText;
                // console.log(`워프 기간 찾음: ${warpPeriod}`);
              }
              
              // ★5 캐릭터 정보 추출
              if (liText.includes('★5') && liText.includes('캐릭터')) {
                // console.log('★5 캐릭터 섹션 찾음');
                const $subUl = $li.find('ul');
                if ($subUl.length) {
                  $subUl.find('li').each((subIndex, subLi) => {
                    const $subLi = $(subLi);
                    const $charLink = $subLi.find('strong a');
                    if ($charLink.length) {
                      const charName = $charLink.text().trim();
                      if (charName) {
                        characters.push({
                          name: charName,
                          rarity: 5
                        });
                        // console.log(`★5 캐릭터 추가: ${charName}`);
                      }
                    }
                  });
                }
              }
            });
          });
          
          // 기간과 캐릭터 둘 다 찾았으면 더 이상 찾지 않음
          if (warpPeriod && characters.length > 0) {
            return false;
          }
        });
        
        // 유효한 워프 정보가 있으면 추가
        if (warpImage && warpPeriod && warpTitle) {
          warpSections.push({
            title: warpTitle,
            image: warpImage,
            period: warpPeriod,
            characters: characters,
            mainCharacter: characters.length > 0 ? characters[0].name : "",
            tableIndex: tableIndex
          });
          
          // console.log(`워프 섹션 추가됨: ${warpTitle}`);
        }
      });
      
      // 추출된 워프 정보를 warpEvents 형태로 변환
      const warpEvents = warpSections.map((section, index) => ({
        image: section.image,
        alt: `${section.title} 워프`,
        period: section.period,
        character: section.mainCharacter || section.title,
        title: section.title,
        characters: section.characters,
        index: index
      }));
      
      // 각 워프의 날짜 정보 파싱 및 정렬
      warpEvents.forEach((event, idx) => {
        if (event.period) {
          // "~ 2025년 10월 15일(수) 12:59" 형태에서 종료일 추출
          const endMatch = event.period.match(/~\s*(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/);
          
          // 시작일 추출 - "업데이트 이후" 같은 텍스트 제거
          let cleanPeriod = event.period.replace(/\d+\.\d+\s*업데이트\s*이후/g, '');
          const startMatch = cleanPeriod.match(/(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/);
          
          const startDate = startMatch ? parseDate(startMatch[1]) : null;
          const endDate = endMatch ? parseDate(endMatch[1]) : null;
          
          event.startDate = startDate;
          event.endDate = endDate;
          
          // console.log(`${idx + 1}. 캐릭터: ${event.character}`);
          // console.log(`   시작일: ${startDate}, 종료일: ${endDate}`);
        }
      });
      
      // 시작일 기준으로 최신순 정렬 (최신이 먼저)
      warpEvents.sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return b.startDate - a.startDate; // 최신이 먼저
      });
      
      // console.log("=== 정렬 후 ===");
      // console.log(warpEvents)
      
      // 현재 날짜와 비교해서 진행중인 워프 찾기
      const now = new Date();
      const currentEvents = [];
      
      warpEvents.forEach(event => {
        if (event.startDate && event.endDate) {
          if (now >= event.startDate && now <= event.endDate) {
            event.isActive = true;
            currentEvents.push(event);
          }
        }
      });
      
      // 현재 이벤트 결정 (진행중인 것이 있으면 첫 번째, 없으면 최신)
      const currentEvent = currentEvents.length > 0 ? currentEvents[0] : warpEvents[0];
      
      if (!currentEvent) {
        await interaction.editReply({
          content: "워프 정보를 찾을 수 없습니다.",
        });
        return;
      }

      // 날짜 정보 포맷팅
      const formatDate = (date) => {
        if (!date) return "정보 없음";
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
      };

      const embed = new EmbedBuilder()
        .setColor(currentEvent.isActive ? 0x00ff00 : 0x7c4dff)
        .setTitle(currentEvent.title)
        .addFields([
          { name: "메인 캐릭터", value: currentEvent.character || "알 수 없음", inline: true },
          { name: '\u200B', value: '\u200B' },
          { name: "시작일", value: formatDate(currentEvent.startDate), inline: true },
          { name: "종료일", value: formatDate(currentEvent.endDate), inline: true }
        ])
        .setURL(url)
        .setImage(currentEvent.image)
        .setTimestamp()
        .setFooter({
          text: "출처: 나무위키",
          iconURL: "https://i.namu.wiki/i/ymOuaWQHtOt_arYO_IPuECD7yQpryRse_FJ1YeDR-oZkce0sTFeIQ9HZWQBOGXDLgoDQubzwm2CJoQl6dUJO9jfyqCfvqtPlOzxFMdnJ88f4DdOZFG2Ik-xIEZQ9pvmSFWXPFKTJQhaDB3POggaEEA.svg",
        });

      // 진행중인 워프가 여러개면 표시
      if (currentEvents.length > 1) { 
        embed.setDescription(`총 ${currentEvents.length}개의 이벤트 워프가 진행중입니다.`);
      } else if (currentEvents.length === 0 && warpEvents.length > 0) {
        embed.setDescription("현재 진행중인 워프는 없습니다. 가장 최근 워프를 표시합니다.");
      }

      // 이벤트 등록 옵션 확인
      const shouldCreateEvent = interaction.options.getBoolean("이벤트등록") || false;
      
      // Discord 이벤트 생성
      if (shouldCreateEvent && interaction.guild && currentEvent.startDate && currentEvent.endDate) {
        try {
          const eventManager = interaction.guild.scheduledEvents;
          
          // 기존 동일한 이름의 이벤트가 있는지 확인
          const existingEvents = await eventManager.fetch();
          const duplicateEvent = existingEvents.find(event => 
            event.name === `${currentEvent.character} 워프` && 
            !event.isCompleted()
          );

          if (!duplicateEvent) {
            // 시작 시간을 12:00로, 종료 시간을 12:59로 설정
            const startDateTime = new Date(currentEvent.startDate);
            startDateTime.setHours(12, 0, 0, 0);
            
            const endDateTime = new Date(currentEvent.endDate);
            endDateTime.setHours(12, 59, 0, 0);

            // 과거 날짜면 현재 시간으로 조정
            const now = new Date();
            if (startDateTime < now) {
              startDateTime.setTime(now.getTime() + 60000); // 1분 후
            }

            const scheduledEvent = await eventManager.create({
              name: `${currentEvent.character} 워프`,
              description: `${currentEvent.title}\n\n워프 기간: ${formatDate(currentEvent.startDate)} ~ ${formatDate(currentEvent.endDate)}\n\n메인 캐릭터: ${currentEvent.character}`,
              scheduledStartTime: startDateTime,
              scheduledEndTime: endDateTime,
              privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
              entityType: GuildScheduledEventEntityType.External,
              entityMetadata: {
                location: '붕괴: 스타레일'
              },
              image: currentEvent.image
            });

            embed.addFields([
              { name: '\u200B', value: '\u200B' },
              { name: "Discord 이벤트", value: `${scheduledEvent.name} 이벤트가 생성되었습니다!`, inline: false }
            ]);
          } else {
            embed.addFields([
              { name: '\u200B', value: '\u200B' },
              { name: "Discord 이벤트", value: "동일한 워프 이벤트가 이미 존재합니다.", inline: false }
            ]);
          }
        } catch (eventError) {
          console.error("Discord 이벤트 생성 오류:", eventError);
          embed.addFields([
            { name: '\u200B', value: '\u200B' },
            { name: "Discord 이벤트", value: "이벤트 생성 중 오류가 발생했습니다.", inline: false }
          ]);
        }
      }

      await interaction.editReply({ embeds: [embed] });
      
      console.log("워프 정보 전송 완료.");

    } catch (error) {
      console.error("워프 정보 크롤링 오류:", error);
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: "워프 정보를 가져오는 중 오류가 발생했습니다.",
        });
      } else {
        await interaction.reply({
          content: "워프 정보를 가져오는 중 오류가 발생했습니다.",
          ephemeral: true
        });
      }
    }
  },
};