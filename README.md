# Volume Moderation Prototype

A Discord bot that joins a voice channel, monitors user volume levels in real time, and warns users if their volume exceeds a certain threshold.

## Prerequisites

1. **Node.js** (v16 or higher recommended)  
2. **Discord Application**  
   - Create a new application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).  
   - Copy your bot token (you will place this into a `.env` file).
3. **MongoDB**  
   - For local development, install and run MongoDB.
     By default, the bot will connect to:
       mongodb://127.0.0.1:27017/volume-moderation
   - Alternatively, set the ```MONGO_URI``` variable in your env file.

## Installation

1. **Clone or Download** this repository.  
2. **Install Dependencies**:  
   ```bash
   npm install
   ```
3. **Create a `.env` file** with:
   ```env
   BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
   ```
4. **Run the Bot**:
  ```bash
  node src/index.js
  ```
## Commands

  - **/join**  
    The bot joins your current voice channel and begins monitoring user volume levels.
  
  - **/leave**  
    The bot leaves the voice channel if you are in the same one.
