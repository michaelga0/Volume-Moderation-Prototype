# Volume Moderation Prototype

A Discord bot for real‑time audio moderation that detects when users speak too loudly.

- Warn users with direct message when they speak too loudly
- Perform moderation actions including mutes, timeouts, and kicks  
- Automated moderation escalation based on repeat offenses  
- Customizable settings via slash commands - adjust thresholds or toggle certain moderation actions on and off

</br>

<details open>
<summary>Commands</summary>

## Commands

### /join
**Usage**: `/join`
Joins your current voice channel and begins monitoring volume levels.

### /leave
**Usage**: `/leave`
Leaves the current voice channel if you are in the same one as the bot.

### /setkickthreshold
**Parameters**: `threshold` (integer, optional)  
**Usage**: `/setkickthreshold threshold:<integer>`  
Set the number of noise violations before the user is kicked.  
If `threshold` is not specified, the current kick threshold is shown; otherwise, it is set to the provided value.

### /setmutethreshold
**Parameters**: `threshold` (integer, optional)  
**Usage**: `/setmutethreshold threshold:<integer>`  
Set the number of noise violations before the user is muted.  
If `threshold` is not specified, the current mute threshold is shown; otherwise, it is set to the provided value.

### /settimeoutthreshold
**Parameters**: `threshold` (integer, optional)  
**Usage**: `/settimeoutthreshold threshold:<integer>`  
Set the number of noise violations before the user is timed out.  
If `threshold` is not specified, the current timeout threshold is shown; otherwise, it is set to the provided value.

### /settimeoutduration
**Parameters**: `minutes` (integer, optional)  
**Usage**: `/settimeoutduration minutes:<integer>`  
Set the number of minutes the user is timed out for.  
If `minutes` is not specified, the current timeout duration is shown; otherwise, it is set to the provided value (must be >= 1).

### /setviolationreset
**Parameters**: `days` (integer, optional), `hours` (integer, optional), `minutes` (integer, optional)  
**Usage**: `/setviolationreset days:<integer> hours:<integer> minutes:<integer>`  
Set the amount of time before the number of violations counted are reset.  
If none are specified, the current violation reset interval is shown; otherwise, it is set to the provided values.


### /setvolumesensitivity
**Parameters**: `sensitivity` (integer, optional)  
**Usage**: `/setviolationreset sensitivity:<integer>`  
Set the volume level that needs to be reached before issuing a warning.  
If `sensitivity` is not specified, the current volume sensitivity is shown; otherwise, it is set to the provided value (must be between 0-100).

### /togglekick
**Parameters**: `enabled` (boolean, required)  
**Usage**: `/togglekick enabled:<true|false>`  
Enables or disables the kick punishment.

### /togglemute
**Parameters**: `enabled` (boolean, required)  
**Usage**: `/togglemute enabled:<true|false>`  
Enables or disables the mute punishment.

### /toggletimeout
**Parameters**: `enabled` (boolean, required)  
**Usage**: `/toggletimeout enabled:<true|false>`  
Enables or disables the timeout punishment.

### /toggleviolationreset
**Parameters**: `enabled` (boolean, required)  
**Usage**: `/toggleviolationreset enabled:<true|false>`  
Enables or disables the violation reset timer.

### /toggleuserexempt
**Parameters**: `user` (required), `exempt` (boolean, optional)  
**Usage**: `/toggleuserexempt user:@username exempt:<true|false>`
Exempt a user from any moderation actions.  
If `exempt` is not specified, the user’s current exemption status is shown; otherwise, it is set to the provided value.

</details>

<details>
<summary>Self-Hosting Instructions</summary>

## Self-Hosting Instructions

### Prerequisites

1. **Node.js** (v22 or higher recommended)  
2. **Discord Application**  
   - Create a new application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).  
   - Copy your bot token (you will place this into a `.env` file).

### Installation

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
  node .
  ```
   
</details>
