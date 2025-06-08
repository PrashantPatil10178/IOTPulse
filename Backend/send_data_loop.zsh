#!/bin/zsh

# Enhanced IoT Device Data Simulator
# Author: Improved version for better reliability and features
# Date: $(date +%Y-%m-%d)

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
readonly USER="Prashant178"
readonly API_KEY="d9fb83a35cf25ea8ca0942b5468cf019012fc70842d18a3dd885453e5ce0f600"
readonly AUTH_HEADER="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMWQ4NDJkOC0yODI1LTQxZDctYWZlMC1lYWNjZDVjZTI3NTgiLCJpYXQiOjE3NDgwNzg0NDgsImV4cCI6MTc0ODE2NDg0OH0.hqiqw5URioppUyM1h1cSkD5wvb0FhLMfJYY7O1KXhN8"
readonly ENDPOINT="http://localhost:3001/api/data"
readonly SEND_INTERVAL=${SEND_INTERVAL:-1}  # seconds between sends
readonly LOG_FILE="iot_simulator.log"
readonly MAX_RETRIES=3
readonly RETRY_DELAY=5

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Device configuration with names and types
declare -A DEVICES=(
  ["temp_sensor"]="3a73c501-4fee-4799-8292-492c0f7aafa8"
  ["humidity_sensor"]="ebdc1691-e39a-4f51-8411-7e4b2f37631d"
  ["motion_detector"]="7d26a781-1e9d-41a0-997a-97bdb403cece"
  ["smart_light"]="11b11e1c-2191-4ad9-9489-e2a88b271952"
  ["smart_plug"]="1b4061ed-e013-4982-ba24-fd4f19e55da4"
  ["camera"]="e43ab856-45d2-4c82-a225-68f963f66f91"
  ["energy_meter"]="f7631d3f-0201-42df-b23c-7b1f4646d924"
  ["water_meter"]="073c6775-fbb9-4880-94d6-aa6ff0dcfa22"
  ["vibration_sensor"]="9494f46f-3017-474b-ac8c-bc314f605679"
  ["pressure_sensor"]="e3c3ee3a-2263-4122-b142-0fce7f6eae68"
)

# Statistics tracking
declare -A STATS=(
  ["total_sent"]=0
  ["total_failed"]=0
  ["start_time"]=$(date +%s)
)

# Utility functions
log_message() {
  local level=$1
  local message=$2
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
  log_message "INFO" "$1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
  log_message "WARN" "$1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
  log_message "ERROR" "$1"
}

# Enhanced random number generators with validation
random_float() {
  local min=$1 max=$2 precision=${3:-1}
  [[ $# -lt 2 ]] && { log_error "random_float requires min and max"; return 1; }
  awk -v min="$min" -v max="$max" -v prec="$precision" \
    'BEGIN{srand(); printf "%.*f", prec, min+rand()*(max-min)}'
}

random_int() {
  local min=$1 max=$2
  [[ $# -lt 2 ]] && { log_error "random_int requires min and max"; return 1; }
  echo $((min + RANDOM % (max - min + 1)))
}

# HTTP request with retry logic
send_data() {
  local device_name=$1
  local device_id=$2
  local data=$3
  local retry_count=0
  
  while [[ $retry_count -lt $MAX_RETRIES ]]; do
    local response=$(curl --silent --write-out "HTTPSTATUS:%{http_code}" \
      --location "$ENDPOINT/$USER/$device_id" \
      --header "x-api-key: $API_KEY" \
      --header "Content-Type: application/json" \
      --header "Authorization: $AUTH_HEADER" \
      --connect-timeout 10 \
      --max-time 30 \
      --data "$data" 2>/dev/null)
    
    local http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
      log_info "$device_name: Successfully sent data (HTTP $http_code)"
      ((STATS[total_sent]++))
      return 0
    else
      ((retry_count++))
      log_warn "$device_name: Failed (HTTP $http_code) - Retry $retry_count/$MAX_RETRIES"
      [[ $retry_count -lt $MAX_RETRIES ]] && sleep $RETRY_DELAY
    fi
  done
  
  log_error "$device_name: Failed after $MAX_RETRIES retries"
  ((STATS[total_failed]++))
  return 1
}

# Signal handlers
cleanup() {
  log_info "Shutting down IoT simulator..."
  print_statistics
  exit 0
}

print_statistics() {
  local runtime=$(($(date +%s) - STATS[start_time]))
  local hours=$((runtime / 3600))
  local minutes=$(((runtime % 3600) / 60))
  local seconds=$((runtime % 60))
  
  echo -e "\n${BLUE}=== IoT Simulator Statistics ===${NC}"
  echo "Runtime: ${hours}h ${minutes}m ${seconds}s"
  echo "Total messages sent: ${STATS[total_sent]}"
  echo "Total failures: ${STATS[total_failed]}"
  echo "Success rate: $(( STATS[total_sent] * 100 / (STATS[total_sent] + STATS[total_failed]) ))%"
  echo -e "${BLUE}===============================${NC}\n"
}

# Device data generators
generate_temperature_data() {
  local temp=$(random_float 20 35 1)
  local humidity=$(random_float 50 80 1)
  local pressure=$(random_float 1000 1020 1)
  
  echo '{
    "temperature": '"$temp"',
    "unit": "celsius",
    "humidity": '"$humidity"',
    "pressure": '"$pressure"',
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
}

generate_humidity_data() {
  local humidity=$(random_float 60 85 1)
  local temp=$(random_float 20 30 1)
  local dew_point=$(random_float 15 20 1)
  
  echo '{
    "humidity": '"$humidity"',
    "unit": "percent",
    "temperature": '"$temp"',
    "dewPoint": '"$dew_point"',
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
}

generate_motion_data() {
  local motion=$((RANDOM % 2))
  local confidence=$(random_int 80 95)
  local duration=$(random_float 2 10 1)
  local sensitivity=$(random_int 5 10)
  local zones=("assembly_line_1" "assembly_line_2" "warehouse" "entrance" "parking")
  local zone=${zones[$((RANDOM % ${#zones[@]}))]}
  
  echo '{
    "motion": '"$([ $motion -eq 1 ] && echo "true" || echo "false")"',
    "confidence": '"$confidence"',
    "duration": '"$duration"',
    "sensitivity": '"$sensitivity"',
    "zone": "'"$zone"'",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
}

generate_smart_light_data() {
  local state=$((RANDOM % 2))
  local brightness=$(random_int 50 100)
  local color_temp=$(random_int 3000 6000)
  local power_usage=$(random_float 10 20 1)
  
  echo '{
    "status": "'"$([ $state -eq 1 ] && echo "on" || echo "off")"'",
    "brightness": '"$brightness"',
    "color": { "r": 255, "g": 255, "b": 255 },
    "colorTemperature": '"$color_temp"',
    "powerConsumption": '"$power_usage"',
    "dimLevel": '"$brightness"',
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
}

generate_smart_plug_data() {
  local state=$((RANDOM % 2))
  local power_usage=$(random_float 1000 1500 1)
  local current=$(random_float 4 7 2)
  local total_energy=$(random_float 300 400 1)
  
  echo '{
    "status": "'"$([ $state -eq 1 ] && echo "on" || echo "off")"'",
    "powerConsumption": '"$power_usage"',
    "voltage": 230,
    "current": '"$current"',
    "totalEnergyUsed": '"$total_energy"',
    "schedule": { "enabled": true, "onTime": "06:00", "offTime": "18:00" },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
}

generate_camera_data() {
  local camera_statuses=("recording" "idle" "offline" "streaming")
  local camera_status=${camera_statuses[$((RANDOM % ${#camera_statuses[@]}))]}
  local fps=$(random_int 15 30)
  local battery=$(random_int 80 100)
  local storage=$(random_float 100 200 1)
  local motion_detected=$((RANDOM % 2))
  
  echo '{
    "status": "'"$camera_status"'",
    "resolution": "1920x1080",
    "fps": '"$fps"',
    "motionDetected": '"$([ $motion_detected -eq 1 ] && echo "true" || echo "false")"',
    "nightVision": true,
    "batteryLevel": '"$battery"',
    "storageUsed": '"$storage"',
    "recordingDuration": '$(random_int 300 600)',
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
}

generate_energy_meter_data() {
  local power_usage=$(random_float 3000 5000 1)
  local total_energy=$(random_float 15000 20000 1)
  local current=$(random_float 15 20 2)
  local power_factor=$(random_float 0.95 0.99 3)
  local cost=$(random_float 400 600 2)
  local peak_demand=$(random_float 4000 6000 1)
  
  echo '{
    "powerUsage": '"$power_usage"',
    "totalEnergy": '"$total_energy"',
    "voltage": 230,
    "current": '"$current"',
    "frequency": 50,
    "powerFactor": '"$power_factor"',
    "cost": '"$cost"',
    "peakDemand": '"$peak_demand"',
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
}

generate_water_meter_data() {
  local flow_rate=$(random_float 20 40 1)
  local total_volume=$(random_float 9000 10000 1)
  local pressure=$(random_float 2 4 2)
  local temp=$(random_float 15 20 1)
  local ph=$(random_float 6.8 7.2 2)
  local turbidity=$(random_float 0.5 1.0 2)
  local tds=$(random_int 180 220)
  local leak=$((RANDOM % 10 == 0 ? 1 : 0))  # 10% chance of leak
  
  echo '{
    "flowRate": '"$flow_rate"',
    "totalVolume": '"$total_volume"',
    "pressure": '"$pressure"',
    "temperature": '"$temp"',
    "quality": { "ph": '"$ph"', "turbidity": '"$turbidity"', "tds": '"$tds"' },
    "leakDetected": '"$([ $leak -eq 1 ] && echo "true" || echo "false")"',
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
}

generate_vibration_data() {
  local vibration=$(random_float 0.5 1.5 2)
  local frequency=$(random_int 100 150)
  local temp=$(random_float 25 35 1)
  local battery=$(random_int 90 95)
  local signal=$(random_int 85 95)
  
  echo '{
    "sensorType": "vibration",
    "primaryMetric": {
      "name": "vibration_intensity",
      "value": '"$vibration"',
      "unit": "mm/s",
      "min": 0,
      "max": 10
    },
    "secondaryMetrics": [
      {
        "name": "frequency",
        "value": '"$frequency"',
        "unit": "Hz",
        "min": 0,
        "max": 1000
      },
      {
        "name": "temperature",
        "value": '"$temp"',
        "unit": "celsius",
        "min": 0,
        "max": 100
      }
    ],
    "status": "active",
    "batteryLevel": '"$battery"',
    "signalStrength": '"$signal"',
    "metadata": {
      "location": "Machine Shop A",
      "notes": "Monitoring conveyor motor",
      "calibrationDate": "2025-05-15T00:00:00Z",
      "firmware": "v2.1.0"
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
}

generate_pressure_data() {
  local pressure=$(random_float 3 5 2)
  local flow_rate=$(random_float 10 20 1)
  local temp=$(random_float 20 30 1)
  local battery=$(random_int 90 95)
  local signal=$(random_int 85 95)
  
  echo '{
    "sensorType": "pressure",
    "primaryMetric": {
      "name": "pressure",
      "value": '"$pressure"',
      "unit": "bar",
      "min": 0,
      "max": 10
    },
    "secondaryMetrics": [
      {
        "name": "flow_rate",
        "value": '"$flow_rate"',
        "unit": "L/min",
        "min": 0,
        "max": 50
      },
      {
        "name": "temperature",
        "value": '"$temp"',
        "unit": "celsius",
        "min": -10,
        "max": 80
      }
    ],
    "status": "active",
    "batteryLevel": '"$battery"',
    "signalStrength": '"$signal"',
    "metadata": {
      "location": "Pipeline Section B",
      "notes": "Monitoring hydraulic system",
      "calibrationDate": "2025-05-20T00:00:00Z",
      "firmware": "v1.3.2"
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
}

# Main execution function
run_simulation() {
  log_info "Starting IoT Device Simulator"
  log_info "Send interval: ${SEND_INTERVAL} seconds"
  log_info "Devices configured: ${#DEVICES[@]}"
  
  while true; do
    log_info "=== Simulation Cycle Started ==="
    
    # Temperature Sensor
    send_data "Temperature Sensor" "${DEVICES[temp_sensor]}" "$(generate_temperature_data)"
    
    # Humidity Sensor  
    send_data "Humidity Sensor" "${DEVICES[humidity_sensor]}" "$(generate_humidity_data)"
    
    # Motion Detector
    send_data "Motion Detector" "${DEVICES[motion_detector]}" "$(generate_motion_data)"
    
    # Smart Light
    send_data "Smart Light" "${DEVICES[smart_light]}" "$(generate_smart_light_data)"
    
    # Smart Plug
    send_data "Smart Plug" "${DEVICES[smart_plug]}" "$(generate_smart_plug_data)"
    
    # Camera
    send_data "Camera" "${DEVICES[camera]}" "$(generate_camera_data)"
    
    # Energy Meter
    send_data "Energy Meter" "${DEVICES[energy_meter]}" "$(generate_energy_meter_data)"
    
    # Water Meter
    send_data "Water Meter" "${DEVICES[water_meter]}" "$(generate_water_meter_data)"
    
    # Vibration Sensor
    send_data "Vibration Sensor" "${DEVICES[vibration_sensor]}" "$(generate_vibration_data)"
    
    # Pressure Sensor
    send_data "Pressure Sensor" "${DEVICES[pressure_sensor]}" "$(generate_pressure_data)"
    
    log_info "=== Cycle Complete - Waiting ${SEND_INTERVAL}s ==="
    sleep "$SEND_INTERVAL"
  done
}

# Argument parsing
show_help() {
  cat << EOF
IoT Device Data Simulator

Usage: $0 [OPTIONS]

OPTIONS:
  -h, --help              Show this help message
  -i, --interval SECONDS  Set send interval (default: 30)
  -s, --stats             Show current statistics and exit
  -t, --test              Test mode - send one cycle and exit
  -d, --device NAME       Send data for specific device only
  
DEVICES:
  temp_sensor, humidity_sensor, motion_detector, smart_light,
  smart_plug, camera, energy_meter, water_meter, 
  vibration_sensor, pressure_sensor

EXAMPLES:
  $0                      # Run with default settings
  $0 -i 60               # Run with 60 second intervals
  $0 -d temp_sensor      # Send only temperature sensor data
  $0 -t                  # Test mode - one cycle only

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -i|--interval)
      SEND_INTERVAL="$2"
      shift 2
      ;;
    -s|--stats)
      print_statistics
      exit 0
      ;;
    -t|--test)
      TEST_MODE=1
      shift
      ;;
    -d|--device)
      SINGLE_DEVICE="$2"
      shift 2
      ;;
    *)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Validate configuration
if ! command -v curl &> /dev/null; then
  log_error "curl is required but not installed"
  exit 1
fi

if [[ -n "${SINGLE_DEVICE:-}" ]] && [[ -z "${DEVICES[$SINGLE_DEVICE]:-}" ]]; then
  log_error "Unknown device: $SINGLE_DEVICE"
  exit 1
fi

# Create log file
touch "$LOG_FILE" || { log_error "Cannot create log file: $LOG_FILE"; exit 1; }

# Run the simulation
if [[ "${TEST_MODE:-0}" -eq 1 ]]; then
  log_info "Running in test mode (single cycle)"
  SEND_INTERVAL=0
fi

if [[ -n "${SINGLE_DEVICE:-}" ]]; then
  log_info "Running single device mode: $SINGLE_DEVICE"
  while true; do
    case $SINGLE_DEVICE in
      temp_sensor) send_data "Temperature Sensor" "${DEVICES[temp_sensor]}" "$(generate_temperature_data)" ;;
      humidity_sensor) send_data "Humidity Sensor" "${DEVICES[humidity_sensor]}" "$(generate_humidity_data)" ;;
      motion_detector) send_data "Motion Detector" "${DEVICES[motion_detector]}" "$(generate_motion_data)" ;;
      smart_light) send_data "Smart Light" "${DEVICES[smart_light]}" "$(generate_smart_light_data)" ;;
      smart_plug) send_data "Smart Plug" "${DEVICES[smart_plug]}" "$(generate_smart_plug_data)" ;;
      camera) send_data "Camera" "${DEVICES[camera]}" "$(generate_camera_data)" ;;
      energy_meter) send_data "Energy Meter" "${DEVICES[energy_meter]}" "$(generate_energy_meter_data)" ;;
      water_meter) send_data "Water Meter" "${DEVICES[water_meter]}" "$(generate_water_meter_data)" ;;
      vibration_sensor) send_data "Vibration Sensor" "${DEVICES[vibration_sensor]}" "$(generate_vibration_data)" ;;
      pressure_sensor) send_data "Pressure Sensor" "${DEVICES[pressure_sensor]}" "$(generate_pressure_data)" ;;
    esac
    [[ "${TEST_MODE:-0}" -eq 1 ]] && break
    sleep "$SEND_INTERVAL"
  done
else
  run_simulation
fi