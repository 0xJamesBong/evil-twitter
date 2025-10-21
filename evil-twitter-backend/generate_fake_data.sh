#!/bin/bash

# Evil Twitter - Fake Data Generation Script
# This script provides easy access to the institutionalized fake data generation endpoints

API_BASE_URL="http://localhost:3000"

echo "🎭 Evil Twitter - Fake Data Generation"
echo "======================================"
echo ""

# Function to make API calls
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -X $method "$API_BASE_URL$endpoint" \
             -H "Content-Type: application/json" \
             -d "$data" \
             -w "\nHTTP Status: %{http_code}\n"
    else
        curl -X $method "$API_BASE_URL$endpoint" \
             -w "\nHTTP Status: %{http_code}\n"
    fi
}

# Function to show menu
show_menu() {
    echo "Choose an option:"
    echo "1. Clear all data (users, tweets, follows)"
    echo "2. Generate fake users only"
    echo "3. Generate fake tweets only (requires existing users)"
    echo "4. Generate complete fake data (users + tweets)"
    echo "5. Show current data counts"
    echo "6. Exit"
    echo ""
}

# Function to show data counts
show_counts() {
    echo "📊 Current Data Counts:"
    echo "======================="
    
    # Get user count
    echo "Users:"
    curl -s "$API_BASE_URL/users" | jq '.users | length' 2>/dev/null || echo "Error fetching users"
    
    # Get tweet count (this would need a tweets endpoint)
    echo "Tweets: (Endpoint not available)"
    
    echo ""
}

# Main script
while true; do
    show_menu
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            echo "🗑️  Clearing all data..."
            make_request "DELETE" "/data/clear"
            echo ""
            ;;
        2)
            echo "👥 Generating fake users..."
            make_request "POST" "/data/users/generate" '{"count": 26, "include_follows": false}'
            echo ""
            ;;
        3)
            echo "🐦 Generating fake tweets..."
            make_request "POST" "/data/tweets/generate" '{"tweets_per_user": 3, "include_replies": false}'
            echo ""
            ;;
        4)
            echo "🎭 Generating complete fake data..."
            make_request "POST" "/data/generate" '{}'
            echo ""
            ;;
        5)
            show_counts
            ;;
        6)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please enter 1-6."
            echo ""
            ;;
    esac
    
    echo "Press Enter to continue..."
    read
    clear
done
