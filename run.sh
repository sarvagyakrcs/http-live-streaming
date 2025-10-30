#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
SUPABASE_GREEN='\033[38;2;62;207;142m'
GOLDEN='\033[38;2;255;215;0m'
RESET='\033[0m'

# Clear screen for better presentation
clear

# Banner
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║${WHITE}     Welcome to DASH - Dynamic Advanced Smart HLS          ${CYAN}║${RESET}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Step 1
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${YELLOW}Step 1:${RESET} ${GREEN}Deploy Traditional Video Fetching Server${RESET}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${WHITE}Navigate to:${RESET} ${CYAN}traditional-video-fetching-server${RESET}"
echo -e "${WHITE}Run command:${RESET} ${GREEN}npm run deploy${RESET}"
echo -e "${WHITE}Action:${RESET} Once deployed, paste the link in ${YELLOW}config.ts${RESET} (dash-board project)"
echo ""

# Step 2
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${YELLOW}Step 2:${RESET} ${GREEN}Configure R2 Bucket Keys${RESET}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${WHITE}Get your R2 bucket keys and add them to:${RESET}"
echo -e "   ${CYAN}•${RESET} ${YELLOW}.env${RESET} file in ${CYAN}dash-board${RESET} project"
echo -e "   ${CYAN}•${RESET} ${YELLOW}.env${RESET} file in ${CYAN}upload-server${RESET} project"
echo ""

# Wait for confirmation
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}✓${RESET} ${WHITE}Press${RESET} ${GREEN}[ENTER]${RESET} ${WHITE}to continue once you've completed steps above...${RESET}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
read

echo ""

# Step 3
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${YELLOW}Step 3:${RESET} ${GREEN}Starting Servers${RESET}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${CYAN}🔄 Launching both servers with live logs...${RESET}"
echo ""

# Create named pipes for log streaming
UPLOAD_PIPE=$(mktemp -u)
DASHBOARD_PIPE=$(mktemp -u)
mkfifo "$UPLOAD_PIPE"
mkfifo "$DASHBOARD_PIPE"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${RED}🛑 Shutting down servers...${RESET}"
    kill $UPLOAD_PID $DASHBOARD_PID 2>/dev/null
    rm -f "$UPLOAD_PIPE" "$DASHBOARD_PIPE"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start upload server and pipe output
(cd upload-server && go run main.go 2>&1 | while IFS= read -r line; do
    echo -e "${GOLDEN}[upload-server]${RESET} $line"
done) &
UPLOAD_PID=$!

# Start dashboard and pipe output
(cd dash-board && npm run dev 2>&1 | while IFS= read -r line; do
    echo -e "${SUPABASE_GREEN}[dash-board]${RESET} $line"
done) &
DASHBOARD_PID=$!

# Wait for both processes
wait