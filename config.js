const { ActivityType } = require('discord.js');

module.exports = {
  ownerId: '521585428915290112',
  status: {
    rotateDefault: [
      { name: 'over the Guild', type: ActivityType.Watching },
      { name: 'Receptionist of the Aventurers\' Guild', type: ActivityType.Playing },
      { name: 'on Twitch', type: ActivityType.Streaming, url: 'https://www.twitch.tv/genshinimpactofficial' },
      { name: '/help', type: ActivityType.Listening },
    ],
    songStatus: true
  },
  spotifyClientId: "f71a3da30e254962965ca2a89d6f74b9",
  spotifyClientSecret: "199a619d22dd4e55a4a2c1a7a3d70e63",
}
