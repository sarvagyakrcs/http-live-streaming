#!/bin/bash

# Color Definitions
GRAY='\033[38;2;156;163;175m'
WHITE='\033[38;2;243;244;246m'
ACCENT='\033[38;2;99;102;241m'
SUCCESS='\033[38;2;34;197;94m'
WARNING='\033[38;2;251;191;36m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# Server log colors
UPLOAD_COLOR='\033[38;2;251;191;36m'      # Amber
DASHBOARD_COLOR='\033[38;2;139;92;246m'   # Purple
SYNC_COLOR='\033[38;2;34;197;94m'         # Green

clear

# Header
echo -e "${DIM}${GRAY}────────────────────────────────────────────────────────────${RESET}"
echo -e "${BOLD}${WHITE}DASH${RESET} ${DIM}${GRAY}Dynamic Advanced Smart HLS${RESET}"
echo -e "${DIM}${GRAY}────────────────────────────────────────────────────────────${RESET}"
echo ""

# Step 1
echo -e "${ACCENT}Step 1:${RESET} ${WHITE}Deploy Traditional Video Fetching Server${RESET}"
echo -e "${DIM}${GRAY}────────────────────────────────────────────────────────────${RESET}"
echo -e "${WHITE}Navigate to:${RESET} traditional-video-fetching-server"
echo -e "${WHITE}Run command:${RESET} ${SUCCESS}npm run deploy${RESET}"
echo -e "${WHITE}Action:${RESET} Once deployed, paste the link in ${WARNING}config.ts${RESET} (dash-board project)"
echo ""

# Step 2
echo -e "${ACCENT}Step 2:${RESET} ${WHITE}Configure R2 Bucket Keys${RESET}"
echo -e "${DIM}${GRAY}────────────────────────────────────────────────────────────${RESET}"
echo -e "${WHITE}Get your R2 bucket keys and add them to:${RESET}"
echo -e "   ${WHITE}•${RESET} ${WARNING}.env${RESET} file in dash-board project"
echo -e "   ${WHITE}•${RESET} ${WARNING}.env${RESET} file in upload-server project"
echo ""

# Step 3
echo -e "${ACCENT}Step 3:${RESET} ${WHITE}Configure S3 Bucket Details${RESET}"
echo -e "${DIM}${GRAY}────────────────────────────────────────────────────────────${RESET}"
echo -e "${WHITE}In sync-server:${RESET}"
echo -e "   ${WHITE}•${RESET} Rename ${WARNING}example.bucket-data.go${RESET} to ${WARNING}bucket-data.go${RESET}"
echo -e "   ${WHITE}•${RESET} Fill in all credentials and bucket details"
echo -e ""
echo -e "${WHITE}In dash-board:${RESET}"
echo -e "   ${WHITE}•${RESET} Update ${WARNING}config.ts${RESET} with S3 bucket details (same as sync-server)"
echo ""

# Step 4
echo -e "${ACCENT}Step 4:${RESET} ${WHITE}Setup Environment Files${RESET}"
echo -e "${DIM}${GRAY}────────────────────────────────────────────────────────────${RESET}"
echo -e "${WHITE}Rename ${WARNING}.env.example${RESET} to ${WARNING}.env${RESET} in:${RESET}"
echo -e "   ${WHITE}•${RESET} sync-server"
echo -e "   ${WHITE}•${RESET} upload-server"
echo -e "   ${WHITE}•${RESET} dash-board"
echo -e "${WHITE}Fill in all credentials in each ${WARNING}.env${RESET} file${RESET}"
echo ""

# Confirmation
echo -e "${DIM}${GRAY}────────────────────────────────────────────────────────────${RESET}"
echo -e "${WHITE}Press${RESET} ${SUCCESS}[ENTER]${RESET} ${WHITE}to continue once you've completed steps above${RESET}"
echo -e "${DIM}${GRAY}────────────────────────────────────────────────────────────${RESET}"
read

echo ""

# Step 5
echo -e "${ACCENT}Step 5:${RESET} ${WHITE}Starting Servers${RESET}"
echo -e "${DIM}${GRAY}────────────────────────────────────────────────────────────${RESET}"
echo -e "Launching all servers with live logs"
echo ""

# Create named pipes
UPLOAD_PIPE=$(mktemp -u)
DASHBOARD_PIPE=$(mktemp -u)
SYNC_PIPE=$(mktemp -u)
mkfifo "$UPLOAD_PIPE"
mkfifo "$DASHBOARD_PIPE"
mkfifo "$SYNC_PIPE"

# Cleanup handler
cleanup() {
    echo ""
    echo -e "${DIM}${GRAY}Shutting down servers${RESET}"
    kill $UPLOAD_PID $DASHBOARD_PID $SYNC_PID 2>/dev/null
    rm -f "$UPLOAD_PIPE" "$DASHBOARD_PIPE" "$SYNC_PIPE"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start upload server
(cd upload-server && go run main.go 2>&1 | while IFS= read -r line; do
    echo -e "${UPLOAD_COLOR}[upload-server]${RESET} $line"
done) &
UPLOAD_PID=$!

# Start dashboard
(cd dash-board && npm run dev 2>&1 | while IFS= read -r line; do
    echo -e "${DASHBOARD_COLOR}[dash-board]${RESET} $line"
done) &
DASHBOARD_PID=$!

# Start sync server
(cd sync-server && go run . 2>&1 | while IFS= read -r line; do
    echo -e "${SYNC_COLOR}[sync-server]${RESET} $line"
done) &
SYNC_PID=$!

wait