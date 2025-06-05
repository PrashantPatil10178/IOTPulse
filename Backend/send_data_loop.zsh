#!/bin/zsh

# Device IDs and User
SMART_LIGHT_ID="61b5f882-7d80-4bb2-b9f0-7ed821efc0be"
TEMP_SENSOR_ID="a5591158-69c6-4200-8ae5-5c30a2a10fb6"
USER="Prashant178"
API_KEY="d9fb83a35cf25ea8ca0942b5468cf019012fc70842d18a3dd885453e5ce0f600"
AUTH_HEADER="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMWQ4NDJkOC0yODI1LTQxZDctYWZlMC1lYWNjZDVjZTI3NTgiLCJpYXQiOjE3NDgwNzg0NDgsImV4cCI6MTc0ODE2NDg0OH0.hqiqw5URioppUyM1h1cSkD5wvb0FhLMfJYY7O1KXhN8"

# Endpoint base
ENDPOINT="http://localhost:3001/api/data"

while true; do
  # Temperature Sensor Data
  temp=$(awk -v min=20 -v max=30 'BEGIN{srand(); printf "%.1f", min+rand()*(max-min)}')
  humidity=$(awk -v min=40 -v max=80 'BEGIN{srand(); printf "%.1f", min+rand()*(max-min)}')

  curl --silent --location "$ENDPOINT/$USER/$TEMP_SENSOR_ID" \
    --header "x-api-key: $API_KEY" \
    --header "Content-Type: application/json" \
    --header "Authorization: $AUTH_HEADER" \
    --data '{
      "temperature": '"$temp"',
      "humidity": '"$humidity"',
      "unit": "celsius",
      "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"
    }' > /dev/null

  echo "TempSensor: Sent temperature $temp°C, humidity $humidity% at $(date)"

  # Smart Light Sensor Data (simulate on/off, brightness, color, power usage)
  state=$(( ($RANDOM % 2) ))
  brightness=$(( (RANDOM % 101) ))  # 0-100
  colors=( "warm_white" "cool_white" "red" "green" "blue" "yellow" )
  color=${colors[$RANDOM % ${#colors[@]} + 1]}
  power_usage=$(awk -v min=1 -v max=15 'BEGIN{srand(); printf "%.1f", min+rand()*(max-min)}')

  curl --silent --location "$ENDPOINT/$USER/$SMART_LIGHT_ID" \
    --header "x-api-key: $API_KEY" \
    --header "Content-Type: application/json" \
    --header "Authorization: $AUTH_HEADER" \
    --data '{
      "metric": "power_usage",
      "value": '"$power_usage"',
      "unit": "watt",
      "state": "'"$([ $state -eq 1 ] && echo "on" || echo "off")"'",
      "brightness": '"$brightness"',
      "color": "'"$color"'",
      "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"
    }' > /dev/null

  echo "SmartLight: Sent power_usage $power_usage W, state $([ $state -eq 1 ] && echo "on" || echo "off"), brightness $brightness%, color $color at $(date)"

  sleep 0.5
done