# Volume Moderation Prototype

A Discord bot for real‑time audio moderation that detects when users speak too loudly.

- Perform moderation actions including warnings, mutes, timeouts, and kicks  
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

### /set-kick-threshold
**Parameters**: `threshold` (integer, optional)  
**Usage**: `/set-kick-threshold threshold:<integer>`  
Set the number of noise violations before the user is kicked.
If `threshold` is not specified, the current kick threshold is shown; otherwise, it is set to the provided value.

### /set-mute-threshold
**Parameters**: `threshold` (integer, optional)  
**Usage**: `/set-mute-threshold threshold:<integer>`  
Set the number of noise violations before the user is muted.
If `threshold` is not specified, the current mute threshold is shown; otherwise, it is set to the provided value.

### /set-timeout-threshold
**Parameters**: `threshold` (integer, optional)  
**Usage**: `/set-timeout-threshold threshold:<integer>`  
Set the number of noise violations before the user is timed out.
If `threshold` is not specified, the current timeout threshold is shown; otherwise, it is set to the provided value.

### /set-timeout-duration
**Parameters**: `minutes` (integer, optional)  
**Usage**: `/set-timeout-duration minutes:<integer>`  
Set the number of minutes the user is timed out for.
If `minutes` is not specified, the current timeout duration is shown; otherwise, it is set to the provided value (must be >= 1).

### /set-violation-reset
**Parameters**: `days` (integer, optional), `hours` (integer, optional), `minutes` (integer, optional)  
**Usage**: `/set-violation-reset days:<integer> hours:<integer> minutes:<integer>`  
Set the amount of time before the number of violations counted are reset.
If none are specified, the current violation reset interval is shown; otherwise, it is set to the provided values.

### /toggle-kick
**Parameters**: `enabled` (boolean, required)  
**Usage**: `/toggle-kick enabled:<true|false>`  
Enables or disables the kick punishment.

### /toggle-mute
**Parameters**: `enabled` (boolean, required)  
**Usage**: `/toggle-mute enabled:<true|false>`  
Enables or disables the mute punishment.

### /toggle-timeout
**Parameters**: `enabled` (boolean, required)  
**Usage**: `/toggle-timeout enabled:<true|false>`  
Enables or disables the timeout punishment.

### /toggle-violation-reset
**Parameters**: `enabled` (boolean, required)  
**Usage**: `/toggle-violation-reset enabled:<true|false>`  
Enables or disables the violation reset timer.

### /toggle-user-exempt
**Parameters**:  
- `user` (required)  
- `exempt` (boolean, optional)  
**Usage**: `/toggle-user-exempt user:@username exempt:<true|false>`
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
