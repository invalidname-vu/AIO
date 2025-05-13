![Animated Background](https://i.ytimg.com/vi/FRIyjs102-c/maxresdefault.jpg)

<h1 align="center" style="font-family: Arial, sans-serif; color: #FF6F61; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
  Smol Katheryne 1.2.2
</h1>

<p align="center">
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square&logo=opensource"
      alt="License: MIT" />
  </a>
</p>

<h2>Installation Guide</h2>

<h3>How to Install</h3>

<h4>Step 1: Update <code>config.json</code> [ USE ENV FILES ]</h4>

<ol>
  <li>Open the <code>config.json</code> and add your MongoDB URL.</li>
</ol>

<h4>ENV SETUP</h4>

<pre>
TOKEN=, 
FACEBOOK_ACCESS_TOKEN=, 
YOUTUBE_API_KEY=, 
TWITCH_CLIENT_ID=, 
TWITCH_ACCESS_TOKEN=, 
INSTAGRAM_ACCESS_TOKEN=, 
MONGODB_URI=
GEMINI_API=
</pre>

<h4>Step 2: Set Up Hosting Service</h4>

<ol>
  <li>Go to your preferred hosting service. For this guide, we use <a href="https://render.com/">Render</a>.</li>
  <li>In the Build & Deploy section, paste your repository URL.</li>
</ol>

<h4>Step 3: Add Build and Start Commands</h4>
<pre>
Run the following commands to install dependencies and start your bot:

npm install
node index.js
</pre>

<h4>Step 4: Get Your Bot Token</h4>
<ol>
  <li>Navigate to the Discord Developer Portal.</li>
  <li>Find your application, and retrieve the bot token from the "Bot" section.</li>
</ol>

<h4>Step 5: Set Environment Variable</h4>
<ol>
  <li>Create an environment variable with the following details:</li>
  <ul>
    <li>Key: TOKEN</li>
    <li>Value: [your bot token]</li>
  </ul>
  <li>Deploy your application using your hosting service’s deployment process.</li>
</ol>

<h4>Step 6: Wait and Test</h4>
<ol>
  <li>Wait approximately five minutes for your bot to deploy and start up.</li>
  <li>Test your bot by sending commands to ensure it is operational.</li>
</ol>

<p>🎉 Congratulations! Your bot is now up and running. 🥳</p>

<h3>Useful Files</h3>
<ul>
  <li><code>UI/banners/musicard.js</code>: Change, add, or remove music cards here.</li>
  <li><code>UI/icons/musicicons.js</code>: Change, add, or remove music icons here.</li>
</ul>
