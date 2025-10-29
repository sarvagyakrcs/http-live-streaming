#!/bin/bash

# --- 1. Configuration ---
# Set your desired output directory here.
# This is the only line you should need to edit.
OUTPUT_DIR="./../output"

# Get the input file from the first command-line argument.
# If no argument is given, it defaults to "suit-yourself.mp4".
INPUT_FILE=${1:-"video.mp4"}

# --- 2. Check for Input File ---
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found."
    echo "Usage: ./transcode.sh [path/to/video.mp4]"
    exit 1
fi

# --- 3. Create Output Directory ---
# The '-p' flag creates parent directories if needed
# and doesn't error if the directory already exists.
echo "Creating output directory at $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# --- 4. Run FFmpeg Command ---
echo "Starting HLS transcoding for $INPUT_FILE..."
echo "Output will be in $OUTPUT_DIR"

# This is the entire command on ONE LINE to prevent shell errors.
ffmpeg -i "$INPUT_FILE" -map 0:v:0 -map 0:a:0 -map 0:v:0 -map 0:a:0 -map 0:v:0 -map 0:a:0 -c:v libx264 -preset fast -c:a aac -filter:v:0 "scale=w=256:h=-2" -b:v:0 200k -maxrate:v:0 250k -b:a:0 64k -filter:v:1 "scale=w=640:h=-2" -b:v:1 800k -maxrate:v:1 1000k -b:a:1 96k -filter:v:2 "scale=w=1280:h=-2" -b:v:2 2500k -maxrate:v:2 3000k -b:a:2 128k -f hls -hls_time 6 -hls_list_size 0 -hls_playlist_type vod -hls_segment_filename "$OUTPUT_DIR/stream_%v/data%03d.ts" -master_pl_name "master.m3u8" -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" "$OUTPUT_DIR/stream_%v.m3u8"

# --- 5. Final Message ---
echo "✅ Transcoding complete!"
echo "Files are in $OUTPUT_DIR"