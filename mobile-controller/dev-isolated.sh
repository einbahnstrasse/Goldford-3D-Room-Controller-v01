#!/bin/bash

# Temporarily hide parent lockfiles
mv ../package-lock.json ../package-lock.json.hidden 2>/dev/null
mv /Users/louisgoldford/package-lock.json /Users/louisgoldford/package-lock.json.hidden 2>/dev/null

# Function to restore lockfiles on exit
restore_lockfiles() {
    mv ../package-lock.json.hidden ../package-lock.json 2>/dev/null
    mv /Users/louisgoldford/package-lock.json.hidden /Users/louisgoldford/package-lock.json 2>/dev/null
}

# Set trap to restore lockfiles on script exit
trap restore_lockfiles EXIT

# Run the dev server
npm run dev:network