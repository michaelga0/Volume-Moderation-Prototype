# Volume Moderation Prototype

A Discord bot that joins a voice channel, monitors user volume levels in real time, and warns users if their volume exceeds a certain threshold.

## Prerequisites

1. **Node.js** (v16 or higher recommended)  
2. **Discord Application**  
   - Create a new application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).  
   - Copy your bot token (you will place this into a `.env` file).
3. **SQL Database**
   - For local development, the bot defaults to using SQLite. A file named `db.sqlite` will be created in the root of the project.
   - Alternatively, set the following environment variables in your `.env` file:
     ```env
     DB_TYPE=your_database_type          # Any type supported by Sequelize ORM
     DB_HOST=your_database_host
     DB_NAME=your_database_name
     DB_USER=your_database_user
     DB_PASSWORD=your_database_password
     ```

## Installation

1. **Clone or Download** this repository.  
2. **Install Dependencies**:  
   ```bash
   npm install
   ```
3. **Create a `.env` file** in the project root with:
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
